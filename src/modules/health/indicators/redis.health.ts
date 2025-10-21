import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { tryCatch } from '@debridge/helpers/try-catch.helper';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    const startTime = Date.now();
    const { data: result, error } = await tryCatch(this.redis.ping());
    const responseTime = Date.now() - startTime;

    if (error || !result) {
      return indicator.down({ error: error?.message || 'Redis ping failed' });
    }

    return indicator.up({ responseTime: `${responseTime}ms` });
  }
}
