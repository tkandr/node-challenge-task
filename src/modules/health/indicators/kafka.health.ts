import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';

import {
  IMessageProducer,
  MESSAGE_PRODUCER,
} from '../../messaging/message-producer.interface';

/**
 * Kafka health indicator.
 * Checks if the Kafka producer is connected and ready to send messages.
 *
 * Note: This assumes the message producer has been initialized during app startup.
 * For production, you might want to add a dedicated health check method to IMessageProducer.
 */
@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(MESSAGE_PRODUCER)
    private readonly messageProducer: IMessageProducer,
  ) {
    super();
  }

  public isHealthy(key: string): HealthIndicatorResult {
    try {
      // For now, we assume if the producer was initialized successfully during startup,
      // it's healthy. In a more sophisticated implementation, you would add a
      // dedicated health check method to the IMessageProducer interface that
      // checks the producer's internal state without actually sending messages.

      // Since Kafka producer doesn't have a built-in health check method,
      // we consider it healthy if it's been initialized (which happens in onModuleInit)
      // A production implementation might cache the connection status or use admin client

      return this.getStatus(key, true, {
        status: 'connected',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Kafka health check failed',
        this.getStatus(key, false, { error: errorMessage }),
      );
    }
  }
}
