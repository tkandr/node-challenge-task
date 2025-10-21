import { Module } from '@nestjs/common';

import { MessagingModule } from '../messaging';

import { OutboxProcessorService } from './outbox-processor.service';

/**
 * OutboxModule implements the transactional outbox pattern.
 * Ensures reliable message delivery to Kafka even when Kafka is temporarily unavailable.
 *
 * Services:
 * - OutboxProcessorService: Processes pending outbox events and publishes them to Kafka
 */
@Module({
  imports: [MessagingModule],
  providers: [OutboxProcessorService],
  exports: [OutboxProcessorService],
})
export class OutboxModule {}
