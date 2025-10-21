import { describe, expect, it } from '@jest/globals';
import { ZodError } from 'zod';

import {
  insertChainSchema,
  insertChainTokenSchema,
  insertPriceChangeLogSchema,
  insertTokenSchema,
  selectChainSchema,
  selectChainTokenSchema,
  updateChainSchema,
  updateChainTokenSchema,
  updateTokenSchema,
  validateInsertChain,
  validateInsertChainToken,
  validateInsertPriceChangeLog,
  validateInsertToken,
  validateUpdateChain,
  validateUpdateChainToken,
  validateUpdateToken,
} from './zod';

// Valid UUIDv7 for testing (generated with uuidv7())
const VALID_UUID_1 = '018e1234-5678-7000-8000-123456789abc';
const VALID_UUID_2 = '018e5678-1234-7000-8000-987654321def';
const VALID_UUID_3 = '018eabcd-ef12-7000-8000-111111111111';

describe('Zod Schemas', () => {
  // ============================================================================
  // CHAINS - Insert Schema Tests
  // ============================================================================

  describe('insertChainSchema', () => {
    it('should validate a valid chain insert', () => {
      const validChain = {
        name: 'Ethereum',
        chainId: 1,
        chainDeId: 1,
        isEnabled: true,
        rpcUrl: 'https://eth.example.com',
        explorerUrl: 'https://etherscan.io',
      };

      const result = insertChainSchema.safeParse(validChain);
      expect(result.success).toBe(true);
    });

    it('should validate chain with minimal required fields', () => {
      const minimalChain = {
        name: 'Polygon',
      };

      const result = insertChainSchema.safeParse(minimalChain);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const invalidChain = {
        name: 'Invalid Chain',
        chainDeId: 999,
        rpcUrl: 'not-a-url',
      };

      const result = insertChainSchema.safeParse(invalidChain);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('rpcUrl');
      }
    });

    it('should reject empty name', () => {
      const invalidChain = {
        name: '',
        chainDeId: 1,
      };

      const result = insertChainSchema.safeParse(invalidChain);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidChain = {
        name: 'a'.repeat(101),
        chainDeId: 1,
      };

      const result = insertChainSchema.safeParse(invalidChain);
      expect(result.success).toBe(false);
    });

    it('should accept null chainId', () => {
      const validChain = {
        name: 'Non-EVM Chain',
        chainId: null,
        chainDeId: 999,
      };

      const result = insertChainSchema.safeParse(validChain);
      expect(result.success).toBe(true);
    });

    it('should use validateInsertChain helper', () => {
      const validChain = {
        name: 'Ethereum',
        chainDeId: 1,
      };

      expect(() => validateInsertChain(validChain)).not.toThrow();
      const validated = validateInsertChain(validChain);
      expect(validated.name).toBe('Ethereum');
    });

    it('should throw on invalid data with helper', () => {
      const invalidChain = {
        name: '',
        chainDeId: 1,
      };

      expect(() => validateInsertChain(invalidChain)).toThrow(ZodError);
    });
  });

  // ============================================================================
  // CHAINS - Update Schema Tests
  // ============================================================================

  describe('updateChainSchema', () => {
    it('should validate partial update with required id', () => {
      const update = {
        id: VALID_UUID_1,
        name: 'Updated Ethereum',
      };

      const result = updateChainSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject update without id', () => {
      const update = {
        name: 'Updated Ethereum',
      };

      const result = updateChainSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should use validateUpdateChain helper', () => {
      const update = {
        id: VALID_UUID_1,
        isEnabled: false,
      };

      expect(() => validateUpdateChain(update)).not.toThrow();
    });
  });

  // ============================================================================
  // CHAINS - Select Schema Tests
  // ============================================================================

  describe('selectChainSchema', () => {
    it('should validate complete chain from database', () => {
      const dbChain = {
        id: VALID_UUID_1,
        name: 'Ethereum',
        chainId: 1,
        chainDeId: 1,
        isEnabled: true,
        rpcUrl: 'https://eth.example.com',
        explorerUrl: 'https://etherscan.io',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = selectChainSchema.safeParse(dbChain);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // TOKENS - Insert Schema Tests
  // ============================================================================

  describe('insertTokenSchema', () => {
    it('should validate a valid token insert', () => {
      const validToken = {
        symbol: 'USDC',
        canonicalName: 'USD Coin',
        description: 'Stablecoin pegged to USD',
        websiteUrl: 'https://www.circle.com/usdc',
        logoBigUrl: 'https://example.com/usdc-big.png',
        logoSmallUrl: 'https://example.com/usdc-small.png',
        logoThumbUrl: 'https://example.com/usdc-thumb.png',
      };

      const result = insertTokenSchema.safeParse(validToken);
      expect(result.success).toBe(true);
    });

    it('should validate token with minimal required fields', () => {
      const minimalToken = {
        symbol: 'ETH',
        canonicalName: 'Ethereum',
      };

      const result = insertTokenSchema.safeParse(minimalToken);
      expect(result.success).toBe(true);
    });

    it('should reject invalid logo URL', () => {
      const invalidToken = {
        symbol: 'USDC',
        canonicalName: 'USD Coin',
        logoBigUrl: 'not-a-url',
      };

      const result = insertTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });

    it('should reject symbol longer than 20 characters', () => {
      const invalidToken = {
        symbol: 'VERYLONGSYMBOLNAME123',
        canonicalName: 'Test Token',
      };

      const result = insertTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });

    it('should use validateInsertToken helper', () => {
      const validToken = {
        symbol: 'WETH',
        canonicalName: 'Wrapped Ether',
      };

      expect(() => validateInsertToken(validToken)).not.toThrow();
    });
  });

  // ============================================================================
  // TOKENS - Update Schema Tests
  // ============================================================================

  describe('updateTokenSchema', () => {
    it('should validate partial update with required id', () => {
      const update = {
        id: VALID_UUID_1,
        description: 'Updated description',
      };

      const result = updateTokenSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should use validateUpdateToken helper', () => {
      const update = {
        id: VALID_UUID_1,
        websiteUrl: 'https://updated.example.com',
      };

      expect(() => validateUpdateToken(update)).not.toThrow();
    });
  });

  // ============================================================================
  // CHAIN_TOKENS - Insert Schema Tests
  // ============================================================================

  describe('insertChainTokenSchema', () => {
    it('should validate a valid chain token insert', () => {
      const validChainToken = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
        decimals: 18,
        isNative: false,
        isProtected: false,
        priority: 100,
        lastUpdateAuthor: 'admin',
        currentPrice: '1234567890',
        lastPriceUpdate: new Date(),
      };

      const result = insertChainTokenSchema.safeParse(validChainToken);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalChainToken = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
      };

      const result = insertChainTokenSchema.safeParse(minimalChainToken);
      expect(result.success).toBe(true);
    });

    it('should reject invalid tokenId UUID', () => {
      const invalidChainToken = {
        tokenId: 'not-a-uuid',
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
      };

      const result = insertChainTokenSchema.safeParse(invalidChainToken);
      expect(result.success).toBe(false);
    });

    it('should accept string address (type coercion)', () => {
      // Note: Drizzle-zod doesn't strictly validate custom types like bytea
      // The database driver will handle the conversion
      const chainToken = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: '0x1234567890abcdef',
      };

      const result = insertChainTokenSchema.safeParse(chainToken);
      expect(result.success).toBe(true);
    });

    it('should reject decimals out of range', () => {
      const invalidChainToken = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
        decimals: 40000, // exceeds smallint max
      };

      const result = insertChainTokenSchema.safeParse(invalidChainToken);
      expect(result.success).toBe(false);
    });

    it('should use validateInsertChainToken helper', () => {
      const validChainToken = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
      };

      expect(() => validateInsertChainToken(validChainToken)).not.toThrow();
    });
  });

  // ============================================================================
  // CHAIN_TOKENS - Update Schema Tests
  // ============================================================================

  describe('updateChainTokenSchema', () => {
    it('should validate partial update with required id', () => {
      const update = {
        id: VALID_UUID_1,
        currentPrice: '9999999999',
        lastPriceUpdate: new Date(),
      };

      const result = updateChainTokenSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject update without id', () => {
      const update = {
        currentPrice: '9999999999',
      };

      const result = updateChainTokenSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should use validateUpdateChainToken helper', () => {
      const update = {
        id: VALID_UUID_1,
        priority: 200,
      };

      expect(() => validateUpdateChainToken(update)).not.toThrow();
    });
  });

  // ============================================================================
  // CHAIN_TOKENS - Select Schema Tests
  // ============================================================================

  describe('selectChainTokenSchema', () => {
    it('should validate complete chain token from database', () => {
      const dbChainToken = {
        id: VALID_UUID_1,
        tokenId: VALID_UUID_2,
        chainId: VALID_UUID_3,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
        decimals: 18,
        isNative: false,
        isProtected: false,
        priority: 100,
        lastUpdateAuthor: 'admin',
        currentPrice: '1234567890',
        lastPriceUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = selectChainTokenSchema.safeParse(dbChainToken);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // PRICE_CHANGE_LOG - Insert Schema Tests
  // ============================================================================

  describe('insertPriceChangeLogSchema', () => {
    it('should validate a valid price change log insert', () => {
      const validLog = {
        chainTokenId: VALID_UUID_1,
        price: '1234567890123456789012345678901234567890',
        changedAt: new Date(),
      };

      const result = insertPriceChangeLogSchema.safeParse(validLog);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimalLog = {
        chainTokenId: VALID_UUID_1,
        price: '100000000',
      };

      const result = insertPriceChangeLogSchema.safeParse(minimalLog);
      expect(result.success).toBe(true);
    });

    it('should reject invalid chainTokenId UUID', () => {
      const invalidLog = {
        chainTokenId: 'not-a-uuid',
        price: '100000000',
      };

      const result = insertPriceChangeLogSchema.safeParse(invalidLog);
      expect(result.success).toBe(false);
    });

    it('should use validateInsertPriceChangeLog helper', () => {
      const validLog = {
        chainTokenId: VALID_UUID_1,
        price: '100000000',
      };

      expect(() => validateInsertPriceChangeLog(validLog)).not.toThrow();
    });
  });

  // ============================================================================
  // Edge Cases and Type Safety Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very large price values', () => {
      const largePrice = {
        chainTokenId: VALID_UUID_1,
        price: '999999999999999999999999999999', // 30 digits (precision limit)
      };

      const result = insertPriceChangeLogSchema.safeParse(largePrice);
      expect(result.success).toBe(true);
    });

    it('should accept null values where nullable', () => {
      const tokenWithNulls = {
        symbol: 'TEST',
        canonicalName: 'Test Token',
        description: null,
        websiteUrl: null,
      };

      const result = insertTokenSchema.safeParse(tokenWithNulls);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const incompleteToken = {
        symbol: 'TEST',
        // missing canonicalName
      };

      const result = insertTokenSchema.safeParse(incompleteToken);
      expect(result.success).toBe(false);
    });

    it('should validate without optional fields', () => {
      // Note: Default values are applied by the database, not by Zod schema
      // The insert schema validates that the data is acceptable, but doesn't apply defaults
      const chainTokenWithDefaults = {
        tokenId: VALID_UUID_1,
        chainId: VALID_UUID_2,
        address: Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'),
        // isNative, isProtected, priority, decimals are optional
      };

      const result = insertChainTokenSchema.safeParse(chainTokenWithDefaults);
      expect(result.success).toBe(true);
    });
  });
});
