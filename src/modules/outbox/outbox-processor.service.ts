import { CronJob } from 'cron';
import { eq, sql } from 'drizzle-orm';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { cronConfig as _cronConfig, ICronConfig } from '@debridge/config/index';
import { DB_TAG, IDbatabase, schema } from '@debridge/db/index';
import { DistributedLockService } from '@debridge/modules/common/distributed-lock.service';
import {
  IMessageProducer,
  MESSAGE_PRODUCER,
  TokenPriceUpdateMessage,
} from '@debridge/modules/messaging';
import { MetricsService } from '@debridge/telemetry';
import { OutboxEventStatus, OutboxEventType } from '@debridge/types';

const OUTBOX_PROCESSOR_LOCK_KEY = 'cron:outbox-processor';
const CRON_JOB_NAME = 'outbox-processor';
const MAX_RETRY_COUNT = 5;

/**
 * Service responsible for processing outbox events and publishing them to Kafka.
 * Implements the transactional outbox pattern for guaranteed message delivery.
 * Uses distributed locking to ensure only one instance runs at a time across multiple pods.
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    @Inject(DB_TAG) private readonly db: IDbatabase,
    @Inject(_cronConfig.KEY) private readonly cronConfig: ICronConfig,
    private readonly lockService: DistributedLockService,
    @Inject(MESSAGE_PRODUCER)
    private readonly messageProducer: IMessageProducer,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Initialize the cron job with dynamic schedule from config.
   */
  public onModuleInit(): void {
    const cronSchedule = this.cronConfig.outboxProcessorSchedule;

    this.logger.log(
      `Registering outbox processor cron job with schedule: ${cronSchedule}`,
    );

    const job = new CronJob(cronSchedule, () => {
      void this.processOutboxEvents();
    });

    this.schedulerRegistry.addCronJob(CRON_JOB_NAME, job);
    job.start();

    this.logger.log('Outbox processor cron job started');
  }

  /**
   * Manually trigger outbox processing (for testing or manual operations).
   */
  public async triggerProcessing(): Promise<void> {
    this.logger.log('Manually triggered outbox processing');
    await this.processOutboxEvents();
  }

  /**
   * Processes pending outbox events with distributed locking.
   * This method is called by the cron job on schedule.
   */
  public async processOutboxEvents(): Promise<void> {
    const lockIdentifier = await this.lockService.acquireLock(
      OUTBOX_PROCESSOR_LOCK_KEY,
      this.cronConfig.outboxProcessorLockTtlMs,
    );

    if (!lockIdentifier) {
      this.logger.debug(
        'Outbox processor already running on another instance, skipping',
      );
      return;
    }

    try {
      this.logger.log('Starting outbox processing job');
      const startTime = Date.now();

      const processedCount = await this.processPendingEvents();

      const duration = Date.now() - startTime;
      this.metricsService.recordOutboxDuration(duration);
      this.logger.log(
        `Outbox processing job completed in ${duration}ms, processed ${processedCount} events`,
      );
    } catch (error) {
      this.logger.error('Error during outbox processing job:', error);
      throw error;
    } finally {
      await this.lockService.releaseLock(
        OUTBOX_PROCESSOR_LOCK_KEY,
        lockIdentifier,
      );
    }
  }

  /**
   * Processes pending outbox events in batches.
   * Events are fetched in FIFO order (by createdAt) to maintain ordering guarantees.
   */
  private async processPendingEvents(): Promise<number> {
    const batchSize = this.cronConfig.outboxProcessorBatchSize;
    let processedCount = 0;

    while (true) {
      // Fetch batch of pending events in FIFO order
      const events = await this.db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.PENDING))
        .orderBy(schema.outboxEvents.createdAt)
        .limit(batchSize);

      if (events.length === 0) {
        break;
      }

      // Record batch size metric
      this.metricsService.recordOutboxBatchSize(events.length);

      for (const event of events) {
        try {
          await this.processEvent(event);
          processedCount++;
        } catch (error) {
          this.logger.error(
            `Error processing outbox event ${event.id}:`,
            error,
          );
          // Continue processing other events even if one fails
        }
      }

      this.logger.debug(`Processed batch of ${events.length} outbox events`);

      // If we got fewer events than the batch size, we've processed all pending events
      if (events.length < batchSize) {
        break;
      }
    }

    return processedCount;
  }

  /**
   * Processes a single outbox event by publishing it to the message producer.
   * Updates the event status based on the result.
   */
  private async processEvent(event: schema.ISelectOutboxEvent): Promise<void> {
    try {
      // Publish message based on event type
      if (event.eventType === OutboxEventType.TOKEN_PRICE_UPDATE) {
        await this.messageProducer.sendPriceUpdateMessage(
          event.payload as TokenPriceUpdateMessage,
        );
      } else {
        const unknownType = String(event.eventType);
        this.logger.warn(`Unknown event type: ${unknownType}`);
        // Mark as failed for unknown event types
        await this.markEventAsFailed(
          event.id,
          `Unknown event type: ${unknownType}`,
        );
        this.metricsService.recordOutboxEventFailed({
          eventType: unknownType,
          reason: 'unknown_type',
        });
        return;
      }

      // Mark as sent on success
      await this.markEventAsSent(event.id);
      this.metricsService.recordOutboxEventProcessed({
        eventType: event.eventType,
      });

      this.logger.debug(`Successfully processed outbox event ${event.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Increment retry count and mark as failed if max retries exceeded
      const newRetryCount = event.retryCount + 1;

      if (newRetryCount >= MAX_RETRY_COUNT) {
        await this.markEventAsFailed(
          event.id,
          `Max retries (${MAX_RETRY_COUNT}) exceeded: ${errorMessage}`,
          newRetryCount,
        );
        this.metricsService.recordOutboxEventFailed({
          eventType: event.eventType,
          reason: 'max_retries',
        });
        this.logger.error(
          `Outbox event ${event.id} failed after ${MAX_RETRY_COUNT} retries`,
        );

        return;
      }
      // Increment retry count and reset to PENDING for retry
      await this.db
        .update(schema.outboxEvents)
        .set({
          retryCount: newRetryCount,
          error: errorMessage,
        })
        .where(eq(schema.outboxEvents.id, event.id));

      this.metricsService.recordOutboxRetry({
        eventType: event.eventType,
        retryCount: newRetryCount,
      });
      this.logger.warn(
        `Outbox event ${event.id} retry ${newRetryCount}/${MAX_RETRY_COUNT}: ${errorMessage}`,
      );
    }
  }

  /**
   * Marks an outbox event as successfully sent.
   */
  private async markEventAsSent(eventId: string): Promise<void> {
    await this.db
      .update(schema.outboxEvents)
      .set({
        status: OutboxEventStatus.SENT,
        processedAt: sql`now()`,
        error: null,
      })
      .where(eq(schema.outboxEvents.id, eventId));
  }

  /**
   * Marks an outbox event as failed.
   */
  private async markEventAsFailed(
    eventId: string,
    error: string,
    retryCount?: number,
  ): Promise<void> {
    await this.db
      .update(schema.outboxEvents)
      .set({
        status: OutboxEventStatus.FAILED,
        processedAt: sql`now()`,
        error,
        ...(retryCount !== undefined && { retryCount }),
      })
      .where(eq(schema.outboxEvents.id, eventId));
  }
}
