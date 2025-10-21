import { and, count, desc, eq, notInArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TestingModule } from '@nestjs/testing';

import { schema } from '@debridge/db/index';
import { DistributedLockService } from '@debridge/modules/common/distributed-lock.service';
import { MockPriceService } from '@debridge/modules/token-price/mock-price.service';
import { TokenPriceUpdateService } from '@debridge/modules/token-price/token-price-update.service';
import { OutboxEventStatus, OutboxEventType } from '@debridge/types';

import { GlobalThisWithSetup } from '../types';

describe('Token Price Update Service', () => {
  let db: PostgresJsDatabase<typeof schema>;
  let moduleRef: TestingModule;
  let tokenPriceUpdateService: TokenPriceUpdateService;
  let mockPriceService: MockPriceService;
  let distributedLockService: DistributedLockService;

  let defaultToken: schema.ISelectToken;
  let defaultChainToken: schema.ISelectChainToken;

  // Fixed IDs from seed data migration (0002_seed-tokens-data.sql)
  const ETHEREUM_CHAIN_ID = '019a027e-d779-7444-9b8b-23779e6550d7';
  const USDC_TOKEN_ID = '019a027e-d7f3-7444-9b8b-731d87a05de1';

  beforeAll(() => {
    ({ db, moduleRef } = (
      globalThis as unknown as GlobalThisWithSetup
    ).__SETUP__);

    tokenPriceUpdateService = moduleRef.get<TokenPriceUpdateService>(
      TokenPriceUpdateService,
    );
    mockPriceService = moduleRef.get<MockPriceService>(MockPriceService);
    distributedLockService = moduleRef.get<DistributedLockService>(
      DistributedLockService,
    );
  });

  beforeEach(async () => {
    // Load seeded USDC token from database
    [defaultToken] = await db
      .select()
      .from(schema.tokens)
      .where(eq(schema.tokens.id, USDC_TOKEN_ID));

    // Find USDC on Ethereum by token_id and chain_id
    [defaultChainToken] = await db
      .select()
      .from(schema.chainTokens)
      .where(
        and(
          eq(schema.chainTokens.tokenId, USDC_TOKEN_ID),
          eq(schema.chainTokens.chainId, ETHEREUM_CHAIN_ID),
        ),
      );

    // Reset the USDC price to a known value before each test
    await db
      .update(schema.chainTokens)
      .set({ currentPrice: '1.00', lastPriceUpdate: null })
      .where(eq(schema.chainTokens.id, defaultChainToken.id));

    const schedulerRegistry =
      moduleRef.get<SchedulerRegistry>(SchedulerRegistry);

    for (const cronName of schedulerRegistry.getCronJobs().keys()) {
      schedulerRegistry.deleteCronJob(cronName);
    }
  });

  describe('Price Update Flow', () => {
    it('successfully updates token price and creates outbox event', async () => {
      // Mock price service to return a deterministic price
      const newPrice = 10;
      jest
        .spyOn(mockPriceService, 'getRandomPriceForToken')
        .mockResolvedValue(newPrice);

      // Trigger price update
      await tokenPriceUpdateService.updateTokenPrices();

      // Verify chain token price was updated
      const [updatedChainToken] = await db
        .select()
        .from(schema.chainTokens)
        .where(eq(schema.chainTokens.id, defaultChainToken.id));

      expect(updatedChainToken.currentPrice).toBe(newPrice.toString());
      expect(updatedChainToken.lastPriceUpdate).toBeTruthy();

      // Verify price change log entry was created
      const priceChangeLogs = await db
        .select()
        .from(schema.priceChangeLog)
        .orderBy(desc(schema.priceChangeLog.id))
        .where(eq(schema.priceChangeLog.chainTokenId, defaultChainToken.id));

      expect(priceChangeLogs.length).toBe(1);
      expect(priceChangeLogs[0].price).toBe(newPrice.toString());

      // Verify outbox event was created
      const outboxEvents = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.aggregateId, defaultChainToken.id));

      expect(outboxEvents.length).toBe(1);
      expect(outboxEvents[0].status).toBe(OutboxEventStatus.PENDING);
      expect(outboxEvents[0].eventType).toBe(
        OutboxEventType.TOKEN_PRICE_UPDATE,
      );
      expect(outboxEvents[0].retryCount).toBe(0);

      // Verify payload structure
      const payload = outboxEvents[0].payload as any;
      expect(payload).toMatchObject({
        tokenId: defaultToken.id,
        symbol: 'USDC',
        oldPrice: 1.0,
        newPrice: newPrice,
      });
      expect(payload.timestamp).toBeTruthy();
    }, 30000);

    it('processes multiple chain tokens in batches', async () => {
      const newPrice = 10;
      const [{ count: totalTokens }] = await db
        .select({ count: count() })
        .from(schema.chainTokens);

      // Mock price service
      jest
        .spyOn(mockPriceService, 'getRandomPriceForToken')
        .mockResolvedValue(newPrice);

      // Trigger price update
      await tokenPriceUpdateService.updateTokenPrices();

      // Verify all tokens were updated by counting tokens with the expected price
      const [{ count: updatedCount }] = await db
        .select({ count: count() })
        .from(schema.chainTokens)
        .where(eq(schema.chainTokens.currentPrice, newPrice.toString()));

      expect(updatedCount).toBe(totalTokens);

      // Verify outbox events were created for all tokens
      const [{ count: eventCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents);

      expect(eventCount).toBe(totalTokens);

      // Verify all events are PENDING
      const [{ count: pendingCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.PENDING));

      expect(pendingCount).toBe(totalTokens);
    });

    it('continues processing on individual token failure', async () => {
      const priceUpdate = 10;
      // Clean up: keep only a few tokens for testing
      const tokensToKeep = await db
        .select({ id: schema.chainTokens.id })
        .from(schema.chainTokens)
        .limit(5);

      const idsToKeep = tokensToKeep.map((t) => t.id);

      await db
        .delete(schema.chainTokens)
        .where(notInArray(schema.chainTokens.id, idsToKeep));

      // Count total tokens
      const [{ count: totalTokens }] = await db
        .select({ count: count() })
        .from(schema.chainTokens);

      // Mock price service to fail once, then succeed
      let callCount = 0;
      jest
        .spyOn(mockPriceService, 'getRandomPriceForToken')
        .mockImplementation(() => {
          callCount++;
          // Fail on first call only
          if (callCount === 1) {
            throw new Error('Price API temporarily unavailable');
          }
          return Promise.resolve(priceUpdate);
        });

      // Trigger price update - should not throw
      await tokenPriceUpdateService.updateTokenPrices();

      // Verify other tokens were updated (all except first one that failed)
      const [{ count: updatedCount }] = await db
        .select({ count: count() })
        .from(schema.chainTokens)
        .where(eq(schema.chainTokens.currentPrice, priceUpdate.toString()));

      expect(updatedCount).toBe(totalTokens - 1);

      // Verify outbox events were created for successful updates only
      const [{ count: eventCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents);

      expect(eventCount).toBe(totalTokens - 1);
    });

    it('respects distributed lock (prevents concurrent execution)', async () => {
      // Acquire lock manually to simulate another instance running
      const lockKey = 'cron:price-update';
      const lockIdentifier = await distributedLockService.acquireLock(
        lockKey,
        30000,
      );

      expect(lockIdentifier).toBeTruthy();

      // Spy on price service to ensure it's not called
      const priceSpy = jest.spyOn(mockPriceService, 'getRandomPriceForToken');

      // Try to trigger price update - should skip due to lock
      await tokenPriceUpdateService.updateTokenPrices();

      // Verify price service was never called
      expect(priceSpy).not.toHaveBeenCalled();

      // Verify chain token was not updated
      const [chainTokenAfter] = await db
        .select()
        .from(schema.chainTokens)
        .where(eq(schema.chainTokens.id, defaultChainToken.id));

      expect(chainTokenAfter.currentPrice).toBe('1'); // unchanged

      // Release lock
      if (lockIdentifier) {
        await distributedLockService.releaseLock(lockKey, lockIdentifier);
      }
    });

    it('handles null currentPrice (first price update)', async () => {
      // Set USDC price to null to simulate first price update
      await db
        .update(schema.chainTokens)
        .set({ currentPrice: null })
        .where(eq(schema.chainTokens.id, defaultChainToken.id));

      const newPrice = 50;
      jest
        .spyOn(mockPriceService, 'getRandomPriceForToken')
        .mockResolvedValue(newPrice);

      await tokenPriceUpdateService.updateTokenPrices();

      // Verify price was set
      const [updatedChainToken] = await db
        .select()
        .from(schema.chainTokens)
        .where(eq(schema.chainTokens.id, defaultChainToken.id));

      expect(updatedChainToken.currentPrice).toBe(newPrice.toString());

      // Verify outbox event has oldPrice: 0
      const outboxEvents = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.aggregateId, defaultChainToken.id));

      const payload = outboxEvents[0].payload as any;
      expect(payload.oldPrice).toBe(0);
      expect(payload.newPrice).toBe(newPrice);
    });
  });
});
