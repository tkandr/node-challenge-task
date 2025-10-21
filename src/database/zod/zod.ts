import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { outboxEvents } from '../schema/outbox.schema';
import {
  chains,
  chainTokens,
  priceChangeLog,
  tokens,
} from '../schema/token-prices.schema';

// ============================================================================
// CHAINS - Zod Schemas
// ============================================================================

export const insertChainSchema = createInsertSchema(chains, {
  // Extend fields for additional validation
  name: (schema) => schema.min(2, 'Name cannot be empty'),
  rpcUrl: (schema) => schema.pipe(z.url()).nullable(),
  explorerUrl: (schema) => schema.pipe(z.url()).nullable(),
});

export const selectChainSchema = createSelectSchema(chains);

export const updateChainSchema = insertChainSchema.partial().required({
  id: true,
});

// ============================================================================
// TOKENS - Zod Schemas
// ============================================================================

export const insertTokenSchema = createInsertSchema(tokens, {
  // Extend URL fields for validation (they remain nullable as per schema)
  websiteUrl: (schema) => schema.pipe(z.url()).nullable(),
  logoBigUrl: (schema) => schema.pipe(z.url()).nullable(),
  logoSmallUrl: (schema) => schema.pipe(z.url()).nullable(),
  logoThumbUrl: (schema) => schema.pipe(z.url()).nullable(),
});

export const selectTokenSchema = createSelectSchema(tokens);

export const updateTokenSchema = insertTokenSchema.partial().required({
  id: true,
});

// ============================================================================
// CHAIN_TOKENS - Zod Schemas
// ============================================================================

// No overrides needed - Drizzle infers everything correctly from the schema
export const insertChainTokenSchema = createInsertSchema(chainTokens);

export const selectChainTokenSchema = createSelectSchema(chainTokens);

export const updateChainTokenSchema = insertChainTokenSchema
  .partial()
  .required({
    id: true,
  });

// ============================================================================
// PRICE_CHANGE_LOG - Zod Schemas
// ============================================================================

// No overrides needed - Drizzle infers everything correctly from the schema
export const insertPriceChangeLogSchema = createInsertSchema(priceChangeLog);

export const selectPriceChangeLogSchema = createSelectSchema(priceChangeLog);

// ============================================================================
// OUTBOX_EVENTS - Zod Schemas
// ============================================================================

export const insertOutboxEventSchema = createInsertSchema(outboxEvents, {
  // Validate event type is not empty
  eventType: (schema) => schema.min(1, 'Event type cannot be empty'),
  aggregateId: (schema) => schema.min(1, 'Aggregate ID cannot be empty'),
});

export const selectOutboxEventSchema = createSelectSchema(outboxEvents);

export const updateOutboxEventSchema = insertOutboxEventSchema
  .partial()
  .required({
    id: true,
  });

// ============================================================================
// Inferred Types
// ============================================================================

export type InsertChain = z.infer<typeof insertChainSchema>;
export type SelectChain = z.infer<typeof selectChainSchema>;
export type UpdateChain = z.infer<typeof updateChainSchema>;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type SelectToken = z.infer<typeof selectTokenSchema>;
export type UpdateToken = z.infer<typeof updateTokenSchema>;

export type InsertChainToken = z.infer<typeof insertChainTokenSchema>;
export type SelectChainToken = z.infer<typeof selectChainTokenSchema>;
export type UpdateChainToken = z.infer<typeof updateChainTokenSchema>;

export type InsertPriceChangeLog = z.infer<typeof insertPriceChangeLogSchema>;
export type SelectPriceChangeLog = z.infer<typeof selectPriceChangeLogSchema>;

export type InsertOutboxEvent = z.infer<typeof insertOutboxEventSchema>;
export type SelectOutboxEvent = z.infer<typeof selectOutboxEventSchema>;
export type UpdateOutboxEvent = z.infer<typeof updateOutboxEventSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates data for inserting a new chain
 */
export function validateInsertChain(data: unknown): InsertChain {
  return insertChainSchema.parse(data);
}

/**
 * Validates data for updating an existing chain
 */
export function validateUpdateChain(data: unknown): UpdateChain {
  return updateChainSchema.parse(data);
}

/**
 * Validates data for inserting a new token
 */
export function validateInsertToken(data: unknown): InsertToken {
  return insertTokenSchema.parse(data);
}

/**
 * Validates data for updating an existing token
 */
export function validateUpdateToken(data: unknown): UpdateToken {
  return updateTokenSchema.parse(data);
}

/**
 * Validates data for inserting a new chain token
 */
export function validateInsertChainToken(data: unknown): InsertChainToken {
  return insertChainTokenSchema.parse(data);
}

/**
 * Validates data for updating an existing chain token
 */
export function validateUpdateChainToken(data: unknown): UpdateChainToken {
  return updateChainTokenSchema.parse(data);
}

/**
 * Validates data for inserting a new price change log entry
 */
export function validateInsertPriceChangeLog(
  data: unknown,
): InsertPriceChangeLog {
  return insertPriceChangeLogSchema.parse(data);
}

/**
 * Validates data for inserting a new outbox event
 */
export function validateInsertOutboxEvent(data: unknown): InsertOutboxEvent {
  return insertOutboxEventSchema.parse(data);
}

/**
 * Validates data for updating an existing outbox event
 */
export function validateUpdateOutboxEvent(data: unknown): UpdateOutboxEvent {
  return updateOutboxEventSchema.parse(data);
}
