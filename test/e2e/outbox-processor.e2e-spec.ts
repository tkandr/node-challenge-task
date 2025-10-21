import { and, count, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { TestingModule } from '@nestjs/testing';

import { schema } from '@debridge/db/index';
import { DistributedLockService } from '@debridge/modules/common/distributed-lock.service';
import {
  TokenPriceUpdateMessage,
  tokenPriceUpdateMessageSchema,
} from '@debridge/modules/messaging/models/token-price-update-message';
import { OutboxProcessorService } from '@debridge/modules/outbox/outbox-processor.service';
import { OutboxEventStatus, OutboxEventType } from '@debridge/types';

import { GlobalThisWithSetup } from '../types';
import TestContainerManager from '../utils/test-container-manager';

const waitMs = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('Outbox Processor Service', () => {
  let db: PostgresJsDatabase<typeof schema>;
  let moduleRef: TestingModule;
  let outboxProcessorService: OutboxProcessorService;
  let distributedLockService: DistributedLockService;
  let kafkaConsumer: Consumer;
  let receivedMessages: TokenPriceUpdateMessage[] = [];

  let defaultToken: schema.ISelectToken;
  let defaultChainToken: schema.ISelectChainToken;

  // Fixed IDs from seed data migration (0002_seed-tokens-data.sql)
  const ETHEREUM_CHAIN_ID = '019a027e-d779-7444-9b8b-23779e6550d7';
  const USDC_TOKEN_ID = '019a027e-d7f3-7444-9b8b-731d87a05de1';

  beforeAll(async () => {
    ({ db, moduleRef } = (
      globalThis as unknown as GlobalThisWithSetup
    ).__SETUP__);

    outboxProcessorService = moduleRef.get<OutboxProcessorService>(
      OutboxProcessorService,
    );
    distributedLockService = moduleRef.get<DistributedLockService>(
      DistributedLockService,
    );

    // Set up Kafka consumer to listen for messages
    const containerManager = TestContainerManager.getInstance();
    const kafkaBrokers = containerManager.getKafkaBrokers();

    const kafka = new Kafka({
      clientId: 'test-consumer',
      brokers: [kafkaBrokers],
    });

    kafkaConsumer = kafka.consumer({ groupId: 'test-group' });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({
      topic: OutboxEventType.TOKEN_PRICE_UPDATE,
      fromBeginning: true,
    });

    // Start consuming messages
    await kafkaConsumer.run({
      // eslint-disable-next-line @typescript-eslint/require-await
      eachMessage: async (payload: EachMessagePayload) => {
        const message = JSON.parse(payload.message.value!.toString());
        const validatedMessage = tokenPriceUpdateMessageSchema.parse(message);
        receivedMessages.push(validatedMessage);
      },
    });
  }, 10000); // 30 second timeout for beforeAll hook

  afterAll(async () => {
    if (kafkaConsumer) {
      await kafkaConsumer.disconnect();
    }
  });

  beforeEach(async () => {
    // Clear received messages before each test
    receivedMessages = [];

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
  });

  describe('Outbox Event Processing', () => {
    it('successfully processes pending outbox event and sends to Kafka', async () => {
      // Create a pending outbox event manually
      const payload: TokenPriceUpdateMessage = {
        tokenId: defaultToken.id,
        symbol: defaultToken.symbol,
        oldPrice: 100,
        newPrice: 200,
        timestamp: new Date(),
      };

      const [outboxEvent] = await db
        .insert(schema.outboxEvents)
        .values({
          aggregateId: defaultChainToken.id,
          eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
          payload,
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
        })
        .returning();

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait for Kafka message to be consumed
      await waitMs(1000);

      // Verify event was marked as SENT
      const [updatedEvent] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.id, outboxEvent.id));

      expect(updatedEvent.status).toBe(OutboxEventStatus.SENT);
      expect(updatedEvent.processedAt).toBeTruthy();
      expect(updatedEvent.error).toBeNull();

      // Verify message was received in Kafka
      expect(receivedMessages.length).toBeGreaterThanOrEqual(1);
      const receivedMessage = receivedMessages.find(
        (msg) => msg.tokenId === defaultToken.id,
      );
      expect(receivedMessage).toBeDefined();
      expect(receivedMessage!.symbol).toBe('USDC');
      expect(receivedMessage!.oldPrice).toBe(100);
      expect(receivedMessage!.newPrice).toBe(200);
    }, 15000);

    it('processes multiple pending events in FIFO order', async () => {
      const now = Date.now();
      const events: TokenPriceUpdateMessage[] = [];

      // Create 5 events with specific timestamps to verify FIFO ordering
      for (let i = 0; i < 5; i++) {
        const payload: TokenPriceUpdateMessage = {
          tokenId: defaultToken.id,
          symbol: defaultToken.symbol,
          oldPrice: 100 + i * 10,
          newPrice: 150 + i * 10,
          timestamp: new Date(now + i * 1000),
        };
        events.push(payload);
      }

      // Insert events with sequential createdAt timestamps
      await db.insert(schema.outboxEvents).values(
        events.map((event, i) => ({
          aggregateId: defaultChainToken.id,
          eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
          payload: event,
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
          createdAt: new Date(now + i * 1000),
        })),
      );

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait for Kafka messages to be consumed
      await waitMs(2000);

      // Verify all events were marked as SENT
      const [{ count: sentCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.SENT));

      expect(sentCount).toBe(5);

      // Verify events were processed in FIFO order by checking database processedAt
      const processedEvents = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.SENT))
        .orderBy(schema.outboxEvents.processedAt);

      expect(processedEvents.length).toBe(5);

      // Verify the order matches creation order in the database
      for (let i = 0; i < processedEvents.length; i++) {
        const payload = processedEvents[i].payload as TokenPriceUpdateMessage;
        expect(payload.oldPrice).toBe(100 + i * 10);
        expect(payload.newPrice).toBe(150 + i * 10);
      }

      // Verify messages were received in Kafka in FIFO order
      const testMessages = receivedMessages.filter(
        (msg) => msg.tokenId === defaultToken.id,
      );
      expect(testMessages.length).toBeGreaterThanOrEqual(5);

      // Verify Kafka messages arrived in the correct chronological order
      for (let i = 0; i < events.length; i++) {
        expect(testMessages[i].oldPrice).toBe(events[i].oldPrice);
        expect(testMessages[i].newPrice).toBe(events[i].newPrice);
      }
    }, 30000);

    it('increments retry count on failure and retries', async () => {
      // Create an outbox event with invalid payload to trigger failure
      const [outboxEvent] = await db
        .insert(schema.outboxEvents)
        .values({
          aggregateId: defaultChainToken.id,
          eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
          payload: {
            tokenId: defaultToken.id,
            symbol: defaultToken.symbol,
            oldPrice: -1, // Invalid negative price should cause validation error
            newPrice: 10,
            timestamp: new Date(),
          },
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
        })
        .returning();

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait a bit for processing
      await waitMs(1000);

      // Verify retry count was incremented
      const [updatedEvent] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.id, outboxEvent.id));

      expect(updatedEvent.retryCount).toBeGreaterThan(0);
      expect(updatedEvent.status).toBe(OutboxEventStatus.PENDING); // Still pending for retry
      expect(updatedEvent.error).toBeTruthy(); // Error message should be recorded
    }, 15000);

    it('marks event as FAILED after max retries exceeded', async () => {
      // Create an outbox event that's already at max retry count - 1
      const [outboxEvent] = await db
        .insert(schema.outboxEvents)
        .values({
          aggregateId: defaultChainToken.id,
          eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
          payload: {
            tokenId: defaultToken.id,
            symbol: defaultToken.symbol,
            oldPrice: -1, // Invalid negative price
            newPrice: 10,
            timestamp: new Date(),
          },
          status: OutboxEventStatus.PENDING,
          retryCount: 4, // Max is 5, so this will be the final retry
        })
        .returning();

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait a bit for processing
      await waitMs(1000);

      // Verify event was marked as FAILED
      const [updatedEvent] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.id, outboxEvent.id));

      expect(updatedEvent.status).toBe(OutboxEventStatus.FAILED);
      expect(updatedEvent.retryCount).toBe(5);
      expect(updatedEvent.error).toContain('Max retries');
      expect(updatedEvent.processedAt).toBeTruthy();
    }, 15000);

    it('handles unknown event types gracefully', async () => {
      // Create an outbox event with an unknown event type
      const [outboxEvent] = await db
        .insert(schema.outboxEvents)
        .values({
          aggregateId: defaultChainToken.id,
          eventType: 'UNKNOWN_EVENT_TYPE' as OutboxEventType,
          payload: {
            tokenId: defaultToken.id,
            symbol: defaultToken.symbol,
            oldPrice: 1.0,
            newPrice: 10.0,
            timestamp: new Date(),
          },
          status: OutboxEventStatus.PENDING,
          retryCount: 0,
        })
        .returning();

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait a bit for processing
      await waitMs(1000);

      // Verify event was marked as FAILED (not retried)
      const [updatedEvent] = await db
        .select()
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.id, outboxEvent.id));

      expect(updatedEvent.status).toBe(OutboxEventStatus.FAILED);
      expect(updatedEvent.error).toContain('Unknown event type');
      expect(updatedEvent.processedAt).toBeTruthy();
    }, 15000);

    it('continues processing other events when one fails', async () => {
      // Create a mix of valid and invalid events
      const validPayload: TokenPriceUpdateMessage = {
        tokenId: defaultToken.id,
        symbol: defaultToken.symbol,
        oldPrice: 100,
        newPrice: 200,
        timestamp: new Date(),
      };

      // Insert invalid event first
      await db.insert(schema.outboxEvents).values({
        aggregateId: defaultChainToken.id,
        eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
        payload: {
          ...validPayload,
          oldPrice: -1, // Invalid
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(Date.now() - 2000),
      });

      // Insert valid events
      await db.insert(schema.outboxEvents).values({
        aggregateId: defaultChainToken.id,
        eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
        payload: validPayload,
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(Date.now() - 1000),
      });

      await db.insert(schema.outboxEvents).values({
        aggregateId: defaultChainToken.id,
        eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
        payload: validPayload,
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
        createdAt: new Date(),
      });

      // Trigger outbox processing
      await outboxProcessorService.processOutboxEvents();

      // Wait for Kafka messages to be consumed
      await waitMs(2000);

      // Verify valid events were sent
      const [{ count: sentCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.SENT));

      expect(sentCount).toBe(2); // Two valid events

      // Verify invalid event is still pending (with retry count incremented)
      const [{ count: pendingCount }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.PENDING));

      expect(pendingCount).toBe(1);

      // Verify messages were received in Kafka
      const testMessages = receivedMessages.filter(
        (msg) => msg.tokenId === defaultToken.id && msg.oldPrice >= 0,
      );
      expect(testMessages.length).toBeGreaterThanOrEqual(2);
    }, 15000);

    it('respects distributed lock (prevents concurrent execution)', async () => {
      // Create a pending outbox event
      await db.insert(schema.outboxEvents).values({
        aggregateId: defaultChainToken.id,
        eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
        payload: {
          tokenId: defaultToken.id,
          symbol: defaultToken.symbol,
          oldPrice: 100,
          newPrice: 200,
          timestamp: new Date(),
        },
        status: OutboxEventStatus.PENDING,
        retryCount: 0,
      });

      // Acquire lock manually to simulate another instance running
      const lockKey = 'cron:outbox-processor';
      const lockIdentifier = await distributedLockService.acquireLock(
        lockKey,
        15000,
      );

      expect(lockIdentifier).toBeTruthy();

      // Count pending events before
      const [{ count: pendingBefore }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.PENDING));

      // Try to trigger outbox processing - should skip due to lock
      await outboxProcessorService.processOutboxEvents();

      // Count pending events after - should be unchanged
      const [{ count: pendingAfter }] = await db
        .select({ count: count() })
        .from(schema.outboxEvents)
        .where(eq(schema.outboxEvents.status, OutboxEventStatus.PENDING));

      expect(pendingAfter).toBe(pendingBefore);

      // Release lock
      if (lockIdentifier) {
        await distributedLockService.releaseLock(lockKey, lockIdentifier);
      }
    }, 15000);
  });

  it('allows manual triggering of outbox processing', async () => {
    // Create a pending outbox event
    const payload: TokenPriceUpdateMessage = {
      tokenId: defaultToken.id,
      symbol: defaultToken.symbol,
      oldPrice: 500,
      newPrice: 600,
      timestamp: new Date(),
    };

    await db.insert(schema.outboxEvents).values({
      aggregateId: defaultChainToken.id,
      eventType: OutboxEventType.TOKEN_PRICE_UPDATE,
      payload,
      status: OutboxEventStatus.PENDING,
      retryCount: 0,
    });

    // Manually trigger processing
    await outboxProcessorService.triggerProcessing();

    // Wait for Kafka message to be consumed
    await waitMs(2000);

    // Verify event was processed
    const [{ count: sentCount }] = await db
      .select({ count: count() })
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.status, OutboxEventStatus.SENT));

    expect(sentCount).toBeGreaterThanOrEqual(1);

    // Verify message was received in Kafka
    const testMessages = receivedMessages.filter(
      (msg) => msg.tokenId === defaultToken.id && msg.newPrice === 600,
    );
    expect(testMessages.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
