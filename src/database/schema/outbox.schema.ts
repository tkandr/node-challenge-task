import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

import { OutboxEventStatus, OutboxEventType } from '@debridge/types';

import { createdAt, timestamptz, uuidv7Default } from './utils';

// ============================================================================
// OUTBOX EVENTS - Transactional Outbox Pattern
// ============================================================================

export const outboxEventStatusEnum = pgEnum('outbox_event_status', [
  OutboxEventStatus.PENDING,
  OutboxEventStatus.SENT,
  OutboxEventStatus.FAILED,
]);

/**
 * Outbox events table for transactional outbox pattern.
 * Ensures at-least-once delivery of Kafka messages by storing them
 * in the same transaction as domain events (price updates).
 *
 * A separate processor service reads PENDING events and publishes them to Kafka.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuidv7Default('id').primaryKey(),

    // Identifies the aggregate/entity this event relates to (e.g., chainTokenId)
    aggregateId: varchar('aggregate_id', { length: 100 }).notNull(),

    // Type of event (e.g., 'token-price-update').
    // In postgres we store varchar because this enum is expected to be changed frequently.
    eventType: varchar('event_type', { length: 255 })
      .notNull()
      .$type<OutboxEventType>(),

    // Event payload as JSON (the actual Kafka message)
    payload: jsonb('payload').notNull(),

    // Processing status
    status: outboxEventStatusEnum('status')
      .notNull()
      .$type<OutboxEventStatus>()
      .default(OutboxEventStatus.PENDING),

    // Number of retry attempts
    retryCount: integer('retry_count').notNull().default(0),

    // When the event was successfully processed
    processedAt: timestamptz('processed_at'),

    // Error message if processing failed
    error: text('error'),

    // When the event was created
    createdAt,
  },
  (table) => [
    index('outbox_events_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),

    index('outbox_events_aggregate_id_idx').on(table.aggregateId),
  ],
);

export type ISelectOutboxEvent = InferSelectModel<typeof outboxEvents>;
export type IInsertOutboxEvent = InferInsertModel<typeof outboxEvents>;
