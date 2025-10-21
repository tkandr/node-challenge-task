import { DrizzlePostgresModule } from '@knaadh/nestjs-drizzle-postgres';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import {
  dbConfigObj,
  enabledConfigs,
  IRedisConfig,
  redisConfig as _redisConfig,
} from '@debridge/config/index';

import { DB_TAG, schema } from './database/index';
import { CommonModule } from './modules/common';
import { HealthModule } from './modules/health/health.module';
import { MessagingModule } from './modules/messaging';
import { OutboxModule } from './modules/outbox';
import { TokenPriceModule } from './modules/token-price';
import { TelemetryModule } from './telemetry';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      load: enabledConfigs,
    }),
    TelemetryModule,
    ScheduleModule.forRoot(),
    DrizzlePostgresModule.register({
      tag: DB_TAG,
      postgres: {
        url: dbConfigObj.connectionString,
        config: {
          max: dbConfigObj.pool.max,
          connect_timeout: dbConfigObj.pool.connectionTimeout, // postgres.js expects seconds
        },
      },
      config: {
        schema,
      },
    }),
    RedisModule.forRootAsync({
      useFactory: (config: IRedisConfig) => ({
        type: 'single',
        options: {
          family: 0,
          host: config.host,
          port: config.port,
          password: config.password,
          connectTimeout: config.connectTimeout,
          lazyConnect: false, // Force immediate connection for fail-fast validation
          enableReadyCheck: true, // Wait for server to be ready before resolving
        },
      }),
      inject: [{ token: _redisConfig.KEY, optional: false }],
    }),
    MessagingModule,
    HealthModule,
    CommonModule,
    OutboxModule,
    TokenPriceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
