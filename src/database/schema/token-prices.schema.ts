import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  bytea,
  createdUpdatedFields,
  priceColumn,
  timestamptz,
  uuidv7Default,
} from './utils';

// ============================================================================
// CHAINS - Blockchain Networks
// ============================================================================

export const chains = pgTable('chains', {
  id: uuidv7Default('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(), // e.g., "Ethereum", "Polygon"
  chainId: integer('chain_id').unique(), // Network chain ID for EVM chains (1, 137, etc.) - null for non-EVM
  chainDeId: integer('chain_deid').unique(), // deBridge chain identifier
  isEnabled: boolean('is_enabled').notNull().default(true),
  rpcUrl: text('rpc_url'),
  explorerUrl: text('explorer_url'),
  ...createdUpdatedFields,
});

export const chainsRelations = relations(chains, ({ many }) => ({
  chainTokens: many(chainTokens),
}));

// ============================================================================
// TOKENS - Abstract Token Concept (metadata shared across chains)
// ============================================================================

export const tokens = pgTable('tokens', {
  id: uuidv7Default('id').primaryKey(),
  symbol: varchar('symbol', { length: 20 }).notNull(), // e.g., "USDC", "WETH"
  canonicalName: varchar('canonical_name', { length: 255 }).notNull(), // e.g., "USD Coin"
  description: text('description'),
  websiteUrl: text('website_url'),
  // Logo URLs in different sizes
  logoBigUrl: text('logo_big_url'),
  logoSmallUrl: text('logo_small_url'),
  logoThumbUrl: text('logo_thumb_url'),
  ...createdUpdatedFields,
});

export const tokensRelations = relations(tokens, ({ many }) => ({
  chainTokens: many(chainTokens),
}));

// ============================================================================
// CHAIN_TOKENS - Token Deployed on Specific Chain
// ============================================================================

export const chainTokens = pgTable(
  'chain_tokens',
  {
    id: uuidv7Default('id').primaryKey(),
    tokenId: uuid('token_id')
      .notNull()
      .references(() => tokens.id, { onDelete: 'cascade' }),
    chainId: uuid('chain_id')
      .notNull()
      .references(() => chains.id, { onDelete: 'cascade' }),
    address: bytea('address').notNull(), // Contract address
    decimals: smallint('decimals').notNull().default(0),
    isNative: boolean('is_native').notNull().default(false), // true for ETH, MATIC, BNB
    isProtected: boolean('is_protected').notNull().default(false), // not sure what this is for, a part of the original schema
    priority: integer('priority').notNull().default(0),
    lastUpdateAuthor: varchar('last_update_author', { length: 255 }),
    currentPrice: priceColumn('current_price'),
    lastPriceUpdate: timestamptz('last_price_update'),
    ...createdUpdatedFields,
  },
  (table) => [
    // Ensure one unique deployment per chain+address
    uniqueIndex('chain_tokens_chain_address_idx').on(
      table.chainId,
      table.address,
    ),
    uniqueIndex('token_id_chain_id_idx').on(table.tokenId, table.chainId),
    // Index for fast lookups
    index('chain_tokens_token_id_idx').on(table.tokenId),
    index('chain_tokens_chain_id_idx').on(table.chainId),
    index('chain_tokens_address_idx').on(table.address),
  ],
);

export const chainTokensRelations = relations(chainTokens, ({ one, many }) => ({
  token: one(tokens, {
    fields: [chainTokens.tokenId],
    references: [tokens.id],
  }),
  chain: one(chains, {
    fields: [chainTokens.chainId],
    references: [chains.id],
  }),
  priceChanges: many(priceChangeLog),
}));

// ============================================================================
// PRICE_CHANGE_LOG - Historical Price Tracking
// ============================================================================

export const priceChangeLog = pgTable(
  'price_change_log',
  {
    id: uuidv7Default('id').primaryKey(),
    chainTokenId: uuid('chain_token_id')
      .notNull()
      .references(() => chainTokens.id, { onDelete: 'cascade' }),
    price: priceColumn('price').notNull(),
    changedAt: timestamptz('changed_at').notNull().defaultNow(),
  },
  (table) => [
    // Index for time-series queries
    index('price_change_log_chain_token_time_idx').on(
      table.chainTokenId,
      table.changedAt,
    ),
  ],
);

export const priceChangeLogRelations = relations(priceChangeLog, ({ one }) => ({
  chainToken: one(chainTokens, {
    fields: [priceChangeLog.chainTokenId],
    references: [chainTokens.id],
  }),
}));

export type ISelectChainToken = InferSelectModel<typeof chainTokens>;
export type IInsertChainToken = InferInsertModel<typeof chainTokens>;

export type ISelectPriceChangeLog = InferSelectModel<typeof priceChangeLog>;
export type IInsertPriceChangeLog = InferInsertModel<typeof priceChangeLog>;

export type ISelectChain = InferSelectModel<typeof chains>;
export type IInsertChain = InferInsertModel<typeof chains>;

export type ISelectToken = InferSelectModel<typeof tokens>;
export type IInsertToken = InferInsertModel<typeof tokens>;
