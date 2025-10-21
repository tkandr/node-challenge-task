import { sql } from 'drizzle-orm';
import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';

import { DB_TAG, IDbatabase } from '@debridge/db/index';
import { tryCatch } from '@debridge/helpers/try-catch.helper';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    @Inject(DB_TAG) private readonly db: IDbatabase,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  public async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    const indicator = this.healthIndicatorService.check(key);

    const { data: result, error } = await tryCatch(
      this.db.execute(sql`SELECT 1 as health_check`),
    );

    if (error || !result) {
      return indicator.down({
        error: error?.message || 'Database query failed',
      });
    }

    return indicator.up({ responseTime: `${Date.now() - startTime}ms` });
  }
}
