import { Injectable } from '@nestjs/common';

@Injectable()
export class MockPriceService {
  private static readonly MIN_DELAY_MS = 50;
  private static readonly MAX_DELAY_MS = 200;
  private static readonly MIN_BASE_PRICE = 1;
  private static readonly MAX_BASE_PRICE = 100000;
  private static readonly PRICE_VOLATILITY_FACTOR = 10;

  public async getRandomPriceForToken(): Promise<number> {
    // Simulate API call delay
    const delay = this.getRandomInt(
      MockPriceService.MIN_DELAY_MS,
      MockPriceService.MAX_DELAY_MS,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));

    return this.getRandomPrice();
  }

  private getRandomPrice(): number {
    const basePrice = this.getRandomInt(
      MockPriceService.MIN_BASE_PRICE,
      MockPriceService.MAX_BASE_PRICE,
    );
    const randomFactor =
      Math.random() * MockPriceService.PRICE_VOLATILITY_FACTOR;
    return basePrice * randomFactor;
  }

  private getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
