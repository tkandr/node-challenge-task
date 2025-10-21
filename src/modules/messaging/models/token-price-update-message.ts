import { z } from 'zod';

// Zod schema for token price update message
// Accepts both Date objects and ISO string timestamps (for deserialization from DB/JSON)
export const tokenPriceUpdateMessageSchema = z.object({
  tokenId: z.uuid(),
  symbol: z.string().min(1),
  oldPrice: z.number().nonnegative(),
  newPrice: z.number().nonnegative(),
  timestamp: z.coerce.date(), // Coerces string timestamps to Date objects
});

// Type derived from the schema
export type TokenPriceUpdateMessage = z.infer<
  typeof tokenPriceUpdateMessageSchema
>;

// Helper function to create a validated message
export function createTokenPriceUpdateMessage(data: {
  tokenId: string;
  symbol: string;
  oldPrice: number;
  newPrice: number;
  timestamp?: Date;
}): TokenPriceUpdateMessage {
  return tokenPriceUpdateMessageSchema.parse({
    ...data,
    timestamp: data.timestamp || new Date(),
  });
}
