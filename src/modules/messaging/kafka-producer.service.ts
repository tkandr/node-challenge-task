import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { kafkaConfig } from '@debridge/config/kafka.config';
import { MetricsService } from '@debridge/telemetry';
import { OutboxEventType } from '@debridge/types';

import {
  TokenPriceUpdateMessage,
  tokenPriceUpdateMessageSchema,
} from './models/token-price-update-message';
import { IMessageProducer } from './message-producer.interface';

/**
 * Kafka implementation of the IMessageProducer interface.
 * This service handles message publishing to Kafka topics with comprehensive configuration:
 * - SSL/TLS support for secure connections
 * - Configurable acknowledgement levels (acks)
 * - Compression (GZIP, Snappy, LZ4, ZSTD)
 * - Batching and idempotency
 * - Retry logic with exponential backoff
 */
@Injectable()
export class KafkaProducerService
  implements IMessageProducer, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;

  constructor(
    @Inject(kafkaConfig.KEY)
    private readonly config: ConfigType<typeof kafkaConfig>,
    private readonly metricsService: MetricsService,
  ) {
    // Build SSL configuration if enabled
    const sslConfig = this.config.ssl.enabled
      ? {
          rejectUnauthorized: this.config.ssl.rejectUnauthorized,
          ca: this.config.ssl.ca?.filter((s) => s.length > 0),
          cert: this.config.ssl.cert || undefined,
          key: this.config.ssl.key || undefined,
        }
      : undefined;

    const kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      connectionTimeout: this.config.connectTimeout,
      requestTimeout: this.config.requestTimeout,
      ssl: sslConfig,
    });

    this.producer = kafka.producer({
      // Retry configuration with exponential backoff
      retry: {
        maxRetryTime: this.config.producer.retry.maxRetryTime,
        initialRetryTime: this.config.producer.retry.initialRetryTime,
        retries: this.config.producer.retry.retries,
        factor: this.config.producer.retry.factor,
        multiplier: this.config.producer.retry.multiplier,
      },

      // Allow auto topic creation
      allowAutoTopicCreation: this.config.producer.allowAutoTopicCreation,

      // Transaction timeout
      transactionTimeout: this.config.producer.transactionTimeout,

      // Idempotent producer for exactly-once semantics
      idempotent: this.config.producer.idempotent,

      // Maximum number of unacknowledged requests
      maxInFlightRequests: this.config.producer.maxInFlightRequests,
    });
  }

  /**
   * Lifecycle hook called when the module is initialized.
   * Implements fail-fast pattern - exits the application if Kafka is unavailable.
   */
  public async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error(
        'FATAL: Failed to connect to Kafka broker. Application cannot start without Kafka.',
        error instanceof Error ? error.stack : String(error),
      );
      // Fail fast - exit the application if Kafka is not available
      process.exit(1);
    }
  }

  /**
   * Connects to Kafka broker with timeout from configuration.
   * @throws Error if connection fails
   */
  public async connect(): Promise<void> {
    const connectPromise = this.producer.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Kafka connection timeout after ${this.config.connectTimeout}ms. Brokers: ${this.config.brokers.join(', ')}`,
          ),
        );
      }, this.config.connectTimeout);
    });

    await Promise.race([connectPromise, timeoutPromise]);
    this.logger.log(
      `✓ Successfully connected to Kafka brokers: ${this.config.brokers.join(', ')}`,
    );
  }

  public async disconnect(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Disconnected from Kafka');
  }

  public async sendPriceUpdateMessage(
    message: TokenPriceUpdateMessage,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      // Validate the message with Zod schema
      tokenPriceUpdateMessageSchema.parse(message);

      const value = JSON.stringify(message);

      const record: ProducerRecord = {
        topic: OutboxEventType.TOKEN_PRICE_UPDATE,
        compression: this.config.producer.compression,
        acks: this.config.producer.acks,
        timeout: this.config.producer.timeout,
        messages: [
          {
            key: message.tokenId,
            value,
          },
        ],
      };

      await this.producer.send(record);

      const duration = Date.now() - startTime;
      this.metricsService.recordKafkaMessageSent({
        topic: OutboxEventType.TOKEN_PRICE_UPDATE,
      });
      this.metricsService.recordKafkaSendDuration(duration, {
        topic: OutboxEventType.TOKEN_PRICE_UPDATE,
      });

      this.logger.log(`Sent message to Kafka: ${value}`);
      return;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metricsService.recordKafkaMessageFailed({
        topic: OutboxEventType.TOKEN_PRICE_UPDATE,
      });
      this.metricsService.recordKafkaSendDuration(duration, {
        topic: OutboxEventType.TOKEN_PRICE_UPDATE,
        error: 'true',
      });
      this.logger.error(`Error sending message: ${error.message}`);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  public async onModuleDestroy(): Promise<void> {
    try {
      await this.disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error.stack);
    }
  }
}
