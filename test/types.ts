import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { schema } from '@debridge/db/index';

export interface GlobalThisWithSetup {
  __SETUP__: {
    moduleRef: TestingModule;
    app: INestApplication;
    db: PostgresJsDatabase<typeof schema>;
  };
}
