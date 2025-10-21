import { CronJob } from 'cron';
import { eq, sql } from 'drizzle-orm';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { cronConfig as _cronConfig, ICronConfig } from '@debridge/config/index';
import { DB_TAG, IDbatabase, schema } from '@debridge/db/index';
import { DistributedLockService } from '@debridge/modules/common';
import { createTokenPriceUpdateMessage } from '@debridge/modules/messaging/models/token-price-update-message';
import { MetricsService } from '@debridge/telemetry';
import { OutboxEventStatus, OutboxEventType } from '@debridge/types';

import { MockPriceService } from './mock-price.service';

const PRICE_UPDATE_LOCK_KEY = 'cron:price-update';
const CRON_JOB_NAME = 'price-update';

/**
 * Service responsible for updating token prices on a scheduled basis.
 * Uses distributed locking to ensure only one instance runs at a time across multiple pods.
 */
@Injectable()
export class TokenPriceUpdateService implements OnModuleInit {
  private readonly logger = new Logger(TokenPriceUpdateService.name);

  constructor(
    @Inject(DB_TAG) private readonly db: IDbatabase,
    @Inject(_cronConfig.KEY) private readonly cronConfig: ICronConfig,
    private readonly lockService: DistributedLockService,
    private readonly priceService: MockPriceService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Initialize the cron job with dynamic schedule from config.
   */
  public onModuleInit(): void {
    const cronSchedule = this.cronConfig.priceUpdateSchedule;

    this.logger.log(
      `Registering price update cron job with schedule: ${cronSchedule}`,
    );

    const job = new CronJob(cronSchedule, () => {
      void this.updateTokenPrices();
    });

    this.schedulerRegistry.addCronJob(CRON_JOB_NAME, job);
    job.start();

    this.logger.log('Price update cron job started');
  }

  /**
   * Manually trigger a price update (for testing or manual operations).
   */
  public async triggerUpdate(): Promise<void> {
    this.logger.log('Manually triggered price update');
    await this.updateTokenPrices();
  }

  /**
   * Updates token prices with distributed locking.
   * This method is called by the cron job on schedule.
   */
  public async updateTokenPrices(): Promise<void> {
    this.logger.log('Updating token prices');
    const lockIdentifier = await this.lockService.acquireLock(
      PRICE_UPDATE_LOCK_KEY,
      this.cronConfig.priceUpdateLockTtlMs,
    );

    if (!lockIdentifier) {
      this.logger.debug(
        'Price update already running on another instance, skipping',
      );
      return;
    }

    try {
      this.logger.log('Starting token price update job');
      const startTime = Date.now();

      await this.processTokenPriceUpdates();

      const duration = Date.now() - startTime;
      this.metricsService.recordPriceUpdateDuration(duration);
      this.logger.log(`Price update job completed in ${duration}ms`);
    } catch (error) {
      this.metricsService.recordPriceUpdateError();
      this.logger.error('Error during price update job:', error);
      throw error;
    } finally {
      await this.lockService.releaseLock(PRICE_UPDATE_LOCK_KEY, lockIdentifier);
    }
  }

  /**
   * Processes token price updates in batches to avoid OOM errors.
   */
  private async processTokenPriceUpdates(): Promise<void> {
    const batchSize = this.cronConfig.priceUpdateBatchSize;
    let offset = 0;
    let processedCount = 0;
    let updatedCount = 0;

    while (true) {
      // Fetch batch of chain tokens
      const chainTokens = await this.db
        .select({
          id: schema.chainTokens.id,
          tokenId: schema.chainTokens.tokenId,
          currentPrice: schema.chainTokens.currentPrice,
          symbol: schema.tokens.symbol,
        })
        .from(schema.chainTokens)
        .innerJoin(
          schema.tokens,
          eq(schema.chainTokens.tokenId, schema.tokens.id),
        )
        .limit(batchSize)
        .offset(offset);

      if (chainTokens.length === 0) {
        break;
      }

      // Record batch size metric
      this.metricsService.recordPriceUpdateBatchSize(chainTokens.length);

      // Process each token in the batch
      for (const chainToken of chainTokens) {
        try {
          const newPrice = await this.priceService.getRandomPriceForToken();
          const oldPrice = chainToken.currentPrice
            ? parseFloat(chainToken.currentPrice)
            : 0;

          await this.updateChainTokenPrice(
            chainToken.id,
            chainToken.tokenId,
            chainToken.symbol,
            oldPrice,
            newPrice,
          );

          updatedCount++;
          this.metricsService.recordPriceUpdate({ symbol: chainToken.symbol });
        } catch (error) {
          this.metricsService.recordPriceUpdateError({
            symbol: chainToken.symbol,
          });
          this.logger.error(
            `Error updating price for chain token ${chainToken.id}:`,
            error,
          );
          // Continue processing other tokens even if one fails
        }
      }

      processedCount += chainTokens.length;
      offset += batchSize;

      this.logger.debug(
        `Processed batch: ${processedCount} tokens, ${updatedCount} updated`,
      );
    }

    this.logger.log(
      `Price update completed: ${processedCount} tokens processed, ${updatedCount} updated`,
    );
  }

  /**
   * Updates a chain token's price in the database and stores event in outbox.
   * Uses a transaction to ensure atomicity between price update and outbox insert.
   * This implements the transactional outbox pattern for guaranteed message delivery.
   */
  private async updateChainTokenPrice(
    chainTokenId: string,
    tokenId: string,
    symbol: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      await this.db.transaction(async (tx) => {
        // Update current price in chain_tokens
        await tx
          .update(schema.chainTokens)
          .set({
            currentPrice: newPrice.toString(),
            lastPriceUpdate: sql`now()`,
          })
          .where(eq(schema.chainTokens.id, chainTokenId));

        // Insert price change log entry
        await tx.insert(schema.priceChangeLog).values({
          chainTokenId,
          price: newPrice.toString(),
          changedAt: new Date(),
        });

        // Create the Kafka message payload
        const message = createTokenPriceUpdateMessage({
          tokenId,
          symbol,
          oldPrice,
          newPrice,
          timestamp: new Date(),
        });

        // Store in outbox table within the same transaction
        // A separate processor will publish this to Kafka
        await tx.insert(schema.outboxEvents).values({
          aggregateId: chainTokenId,
          eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
          payload: message,
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
        });
      });

      const duration = Date.now() - startTime;
      this.metricsService.recordDbTransactionDuration(duration, {
        operation: 'update_price',
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordDbTransactionDuration(duration, {
        operation: 'update_price',
        error: 'true',
      });
      throw error;
    }
  }
}
