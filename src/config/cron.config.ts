import { get } from 'env-var';
import { registerAs } from '@nestjs/config';

export interface ICronConfig {
  priceUpdateSchedule: string;
  priceUpdateLockTtlMs: number;
  priceUpdateBatchSize: number;
  outboxProcessorSchedule: string;
  outboxProcessorLockTtlMs: number;
  outboxProcessorBatchSize: number;
}

const cronConfigObj: ICronConfig = {
  // Default: every 5 seconds
  priceUpdateSchedule: get('PRICE_UPDATE_CRON_SCHEDULE')
    .default('*/5 * * * * *')
    .asString(),

  // Lock TTL: 30 seconds (should be longer than expected job duration)
  priceUpdateLockTtlMs: get('PRICE_UPDATE_LOCK_TTL_MS')
    .default(30000)
    .asIntPositive(),

  // Batch size for processing tokens (to avoid OOM with large datasets)
  priceUpdateBatchSize: get('PRICE_UPDATE_BATCH_SIZE')
    .default(100)
    .asIntPositive(),

  // Outbox processor: every 2 seconds (more frequent to reduce delivery latency)
  outboxProcessorSchedule: get('OUTBOX_PROCESSOR_CRON_SCHEDULE')
    .default('*/2 * * * * *')
    .asString(),

  // Lock TTL: 20 seconds (should be longer than expected job duration)
  outboxProcessorLockTtlMs: get('OUTBOX_PROCESSOR_LOCK_TTL_MS')
    .default(20000)
    .asIntPositive(),

  // Batch size for processing outbox events
  outboxProcessorBatchSize: get('OUTBOX_PROCESSOR_BATCH_SIZE')
    .default(100)
    .asIntPositive(),
};

export const cronConfig = registerAs<ICronConfig>('cron', () => cronConfigObj);
