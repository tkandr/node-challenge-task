import { Module } from '@nestjs/common';

import { MockPriceService } from './mock-price.service';
import { TokenPriceUpdateService } from './token-price-update.service';

/**
 * TokenPriceModule handles token price updates and management.
 *
 * Services:
 * - MockPriceService: Simulates external price feed for testing
 * - TokenPriceUpdateService: Orchestrates scheduled price updates with transactional outbox
 */
@Module({
  providers: [MockPriceService, TokenPriceUpdateService],
  exports: [MockPriceService, TokenPriceUpdateService],
})
export class TokenPriceModule {}
