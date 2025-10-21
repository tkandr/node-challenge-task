import { metrics } from '@opentelemetry/api';
import { Counter, Histogram, Meter, ObservableGauge } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly meter: Meter;

  // Price update metrics
  private readonly priceUpdateCounter: Counter;
  private readonly priceUpdateDuration: Histogram;
  private readonly priceUpdateErrors: Counter;
  private readonly priceUpdateBatchSize: Histogram;

  // Outbox metrics
  private readonly outboxProcessedCounter: Counter;
  private readonly outboxFailedCounter: Counter;
  private readonly outboxDuration: Histogram;
  private readonly outboxRetryCounter: Counter;
  private readonly outboxBatchSize: Histogram;

  // Kafka metrics
  private readonly kafkaMessagesSent: Counter;
  private readonly kafkaMessagesFailed: Counter;
  private readonly kafkaSendDuration: Histogram;

  // Database metrics
  private readonly dbQueryDuration: Histogram;
  private readonly dbTransactionDuration: Histogram;

  constructor() {
    this.meter = metrics.getMeter('token-price-service');

    // Initialize price update metrics
    this.priceUpdateCounter = this.meter.createCounter('price_updates_total', {
      description: 'Total number of token price updates',
    });

    this.priceUpdateDuration = this.meter.createHistogram(
      'price_update_duration_ms',
      {
        description: 'Duration of price update operations in milliseconds',
        unit: 'ms',
      },
    );

    this.priceUpdateErrors = this.meter.createCounter('price_update_errors', {
      description: 'Total number of price update errors',
    });

    this.priceUpdateBatchSize = this.meter.createHistogram(
      'price_update_batch_size',
      {
        description: 'Number of tokens processed in each batch',
      },
    );

    // Initialize outbox metrics
    this.outboxProcessedCounter = this.meter.createCounter(
      'outbox_events_processed_total',
      {
        description: 'Total number of outbox events processed',
      },
    );

    this.outboxFailedCounter = this.meter.createCounter(
      'outbox_events_failed_total',
      {
        description: 'Total number of outbox events that failed',
      },
    );

    this.outboxDuration = this.meter.createHistogram(
      'outbox_processing_duration_ms',
      {
        description: 'Duration of outbox processing operations in milliseconds',
        unit: 'ms',
      },
    );

    this.outboxRetryCounter = this.meter.createCounter('outbox_retries_total', {
      description: 'Total number of outbox event retries',
    });

    this.outboxBatchSize = this.meter.createHistogram(
      'outbox_processing_batch_size',
      {
        description: 'Number of events processed in each outbox batch',
      },
    );

    // Initialize Kafka metrics
    this.kafkaMessagesSent = this.meter.createCounter(
      'kafka_messages_sent_total',
      {
        description: 'Total number of messages sent to Kafka',
      },
    );

    this.kafkaMessagesFailed = this.meter.createCounter(
      'kafka_messages_failed_total',
      {
        description: 'Total number of failed Kafka message sends',
      },
    );

    this.kafkaSendDuration = this.meter.createHistogram(
      'kafka_send_duration_ms',
      {
        description: 'Duration of Kafka send operations in milliseconds',
        unit: 'ms',
      },
    );

    // Initialize database metrics
    this.dbQueryDuration = this.meter.createHistogram('db_query_duration_ms', {
      description: 'Duration of database queries in milliseconds',
      unit: 'ms',
    });

    this.dbTransactionDuration = this.meter.createHistogram(
      'db_transaction_duration_ms',
      {
        description: 'Duration of database transactions in milliseconds',
        unit: 'ms',
      },
    );
  }

  // Price update methods
  public recordPriceUpdate(attributes?: Record<string, string | number>) {
    this.priceUpdateCounter.add(1, attributes);
  }

  public recordPriceUpdateDuration(
    durationMs: number,
    attributes?: Record<string, string | number>,
  ) {
    this.priceUpdateDuration.record(durationMs, attributes);
  }

  public recordPriceUpdateError(attributes?: Record<string, string | number>) {
    this.priceUpdateErrors.add(1, attributes);
  }

  public recordPriceUpdateBatchSize(
    size: number,
    attributes?: Record<string, string | number>,
  ) {
    this.priceUpdateBatchSize.record(size, attributes);
  }

  // Outbox methods
  public recordOutboxEventProcessed(
    attributes?: Record<string, string | number>,
  ) {
    this.outboxProcessedCounter.add(1, attributes);
  }

  public recordOutboxEventFailed(attributes?: Record<string, string | number>) {
    this.outboxFailedCounter.add(1, attributes);
  }

  public recordOutboxDuration(
    durationMs: number,
    attributes?: Record<string, string | number>,
  ) {
    this.outboxDuration.record(durationMs, attributes);
  }

  public recordOutboxRetry(attributes?: Record<string, string | number>) {
    this.outboxRetryCounter.add(1, attributes);
  }

  public recordOutboxBatchSize(
    size: number,
    attributes?: Record<string, string | number>,
  ) {
    this.outboxBatchSize.record(size, attributes);
  }

  // Kafka methods
  public recordKafkaMessageSent(attributes?: Record<string, string | number>) {
    this.kafkaMessagesSent.add(1, attributes);
  }

  public recordKafkaMessageFailed(
    attributes?: Record<string, string | number>,
  ) {
    this.kafkaMessagesFailed.add(1, attributes);
  }

  public recordKafkaSendDuration(
    durationMs: number,
    attributes?: Record<string, string | number>,
  ) {
    this.kafkaSendDuration.record(durationMs, attributes);
  }

  // Database methods
  public recordDbQueryDuration(
    durationMs: number,
    attributes?: Record<string, string | number>,
  ) {
    this.dbQueryDuration.record(durationMs, attributes);
  }

  public recordDbTransactionDuration(
    durationMs: number,
    attributes?: Record<string, string | number>,
  ) {
    this.dbTransactionDuration.record(durationMs, attributes);
  }

  // Observable gauge for custom metrics
  public createObservableGauge(
    name: string,
    callback: () => number,
    description?: string,
  ): ObservableGauge {
    return this.meter.createObservableGauge(name, {
      description,
    });
  }

  // Helper for timing operations
  public async measureAsync<T>(
    operation: () => Promise<T>,
    recordDuration: (duration: number) => void,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      recordDuration(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordDuration(duration);
      throw error;
    }
  }
}
