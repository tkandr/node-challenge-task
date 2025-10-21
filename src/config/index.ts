export * from './app.config';
export * from './cron.config';
export * from './db.config';
export * from './kafka.config';
export * from './otel.config';
export * from './redis.config';

import { appConfig, IAppConfig } from './app.config';
import { cronConfig, ICronConfig } from './cron.config';
import { dbConfig, IDbConfig } from './db.config';
import { IKafkaConfig, kafkaConfig } from './kafka.config';
import { IOtelConfig, otelConfig } from './otel.config';
import { IRedisConfig, redisConfig } from './redis.config';

export interface IAllAppConfig {
  app: IAppConfig;
  db: IDbConfig;
  redis: IRedisConfig;
  cron: ICronConfig;
  kafka: IKafkaConfig;
  otel: IOtelConfig;
}

export const enabledConfigs = [
  appConfig,
  dbConfig,
  redisConfig,
  cronConfig,
  kafkaConfig,
  otelConfig,
];
