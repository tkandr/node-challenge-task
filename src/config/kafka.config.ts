import { get } from 'env-var';
import { CompressionTypes } from 'kafkajs';
import { registerAs } from '@nestjs/config';

const compressionTypeMap = {
  None: CompressionTypes.None,
  GZIP: CompressionTypes.GZIP,
  Snappy: CompressionTypes.Snappy,
  LZ4: CompressionTypes.LZ4,
  ZSTD: CompressionTypes.ZSTD,
};

export interface IKafkaSSLConfig {
  enabled: boolean;
  rejectUnauthorized?: boolean;
  ca?: string[];
  cert?: string;
  key?: string;
}

export interface IKafkaConfig {
  clientId: string;
  brokers: string[];
  allowAutoTopicCreation: boolean;
  connectTimeout: number;
  requestTimeout: number;

  ssl: IKafkaSSLConfig;

  producer: {
    // Serialization
    allowAutoTopicCreation: boolean;
    transactionTimeout: number;

    // Acknowledgement
    acks: number;

    // Timeouts
    timeout: number;

    // Compression
    compression: CompressionTypes;

    // Batching
    batchSize: number;
    maxInFlightRequests: number;

    // Retry configuration
    retry: {
      maxRetryTime: number;
      initialRetryTime: number;
      retries: number;
      factor: number;
      multiplier: number;
    };

    // Idempotency
    idempotent: boolean;
  };
}

const parseCompressionType = (
  value: keyof typeof compressionTypeMap,
): CompressionTypes => {
  return compressionTypeMap[value] || CompressionTypes.GZIP; // Default fallback
};

export const kafkaConfigObj: IKafkaConfig = {
  clientId: get('KAFKA_CLIENT_ID').default('token-price-service').asString(),
  brokers: get('KAFKA_BROKERS')
    .default('localhost:9092')
    .asString()
    .split(',')
    .map((b) => b.trim()),
  allowAutoTopicCreation: get('KAFKA_ALLOW_AUTO_TOPIC_CREATION')
    .default('true')
    .asBool(),
  connectTimeout: get('KAFKA_CONNECT_TIMEOUT').default('10000').asInt(),
  requestTimeout: get('KAFKA_REQUEST_TIMEOUT').default('30000').asInt(),

  ssl: {
    enabled: get('KAFKA_SSL_ENABLED').default('false').asBool(),
    rejectUnauthorized: get('KAFKA_SSL_REJECT_UNAUTHORIZED')
      .default('true')
      .asBool(),
    ca: get('KAFKA_SSL_CA')
      .default('')
      .asString()
      .split(',')
      .filter((s) => s.length > 0),
    cert: get('KAFKA_SSL_CERT').default('').asString(),
    key: get('KAFKA_SSL_KEY').default('').asString(),
  },

  producer: {
    allowAutoTopicCreation: get('KAFKA_PRODUCER_ALLOW_AUTO_TOPIC_CREATION')
      .default('true')
      .asBool(),
    transactionTimeout: get('KAFKA_PRODUCER_TRANSACTION_TIMEOUT')
      .default('60000')
      .asInt(),

    // Acknowledgement: -1 = all replicas, 1 = leader only, 0 = no acknowledgement
    acks: Number(
      get('KAFKA_PRODUCER_ACKS').default('-1').asEnum(['-1', '1', '0']),
    ),

    // Timeout for the producer to wait for a response
    timeout: get('KAFKA_PRODUCER_TIMEOUT').default('30000').asInt(),

    // Compression type for messages
    compression: parseCompressionType(
      get('KAFKA_PRODUCER_COMPRESSION')
        .default('None')
        .asEnum(
          Object.keys(compressionTypeMap),
        ) as keyof typeof compressionTypeMap,
    ),

    // Maximum batch size in bytes
    batchSize: get('KAFKA_PRODUCER_BATCH_SIZE').default('16384').asInt(),

    // Maximum number of unacknowledged requests
    maxInFlightRequests: get('KAFKA_PRODUCER_MAX_IN_FLIGHT_REQUESTS')
      .default('5')
      .asInt(),

    retry: {
      maxRetryTime: get('KAFKA_PRODUCER_MAX_RETRY_TIME')
        .default('30000')
        .asInt(),
      initialRetryTime: get('KAFKA_PRODUCER_INITIAL_RETRY_TIME')
        .default('300')
        .asInt(),
      retries: get('KAFKA_PRODUCER_RETRIES').default('5').asInt(),
      factor: get('KAFKA_PRODUCER_RETRY_FACTOR').default('0.2').asFloat(),
      multiplier: get('KAFKA_PRODUCER_RETRY_MULTIPLIER').default('2').asInt(),
    },

    // Idempotent producer ensures exactly-once semantics
    idempotent: get('KAFKA_PRODUCER_IDEMPOTENT').default('true').asBool(),
  },
};

export const kafkaConfig = registerAs<IKafkaConfig>(
  'kafka',
  () => kafkaConfigObj,
);
