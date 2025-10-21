import { drizzle as drizzlePgJs } from 'drizzle-orm/postgres-js';
import * as process from 'node:process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  IKafkaConfig,
  kafkaConfig,
  kafkaConfigObj,
} from '@debridge/config/kafka.config';
import { IRedisConfig, redisConfig } from '@debridge/config/redis.config';
import { DB_TAG, schema } from '@debridge/db/index';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { GlobalThisWithSetup } from '../types';
import TestContainerManager from '../utils/test-container-manager';

process.env.NODE_ENV = 'test';

let moduleRef: TestingModule;

// Helper function to create session for a user

beforeAll(async () => {
  try {
    const containerManager = TestContainerManager.getInstance();

    const { dbClient, redisContainer } = await containerManager.initialize();

    const kafkaBrokers = containerManager.getKafkaBrokers();

    // Here We need to import some boilerplate code from our the main.ts file to have a consistent setup
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DB_TAG)
      .useValue(drizzlePgJs(dbClient, { schema }))
      .overrideProvider(redisConfig.KEY)
      .useValue({
        // connectionString: `redis://${redisContainer.getHost()}:${redisContainer.getFirstMappedPort()}`,
        host: redisContainer.getHost(),
        port: redisContainer.getFirstMappedPort(),
        password: undefined,
        username: undefined,
      } as IRedisConfig)
      .overrideProvider(kafkaConfig.KEY)
      .useValue({
        ...kafkaConfigObj,
        brokers: [kafkaBrokers],
      } as IKafkaConfig)
      .compile();

    const app: INestApplication = moduleRef.createNestApplication({
      bodyParser: true,
      rawBody: true,
    });

    configureApp(app);

    await app.init();

    const db = moduleRef.get(DB_TAG);

    (globalThis as unknown as GlobalThisWithSetup).__SETUP__ = {
      moduleRef,
      app,
      db,
    };
    console.log('Global setup object created and assigned to globalThis');
  } catch (error) {
    console.error('beforeAll failed with an error:', error);
    process.exit(1);
  }
}, 60 * 1000);

beforeEach(async () => {
  try {
    const containerManager = TestContainerManager.getInstance();
    const { dbClient } = await containerManager.initialize();

    await dbClient`DROP SCHEMA public CASCADE`;
    await dbClient`DROP SCHEMA drizzle CASCADE`;
    await dbClient`CREATE SCHEMA public`;

    await containerManager.runMigrations();

    jest.restoreAllMocks();
  } catch (error) {
    console.error('beforeEach failed with an error:', error);
  }
}, 10 * 1000);

afterAll(async () => {
  console.log('Running afterAll in e2e-setup.ts');
  try {
    if (moduleRef) {
      console.log('Closing module reference');
      await moduleRef.close();
    } else {
      console.log('No module reference to close');
    }

    const containerManager = TestContainerManager.getInstance();
    if (containerManager) {
      console.log('Cleaning up container manager');
      await containerManager.cleanup();
    } else {
      console.log('No container manager to clean up');
    }
  } catch (error) {
    console.error('afterAll failed with an error:', error);
  }
}, 25 * 1000);
