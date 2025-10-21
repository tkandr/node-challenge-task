import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { get } from 'env-var';
import { join } from 'path';
import postgres from 'postgres';

import { dbConfigObj } from '@debridge/config/db.config';
import { redisConfigObj } from '@debridge/config/redis.config';
import * as schema from '@debridge/db/schema';
import { tryCatch } from '@debridge/helpers/try-catch.helper';

const dbVersion = get('COMPOSE_PG_VERSION').default('18-alpine').asString();
const pgImage = get('COMPOSE_PG_IMAGE').default('postgres').asString();

class TestContainerManager {
  private static instances: Map<string, TestContainerManager> = new Map();

  static getInstance(): TestContainerManager {
    const workerId = process.env.JEST_WORKER_ID || '1';
    if (!TestContainerManager.instances.has(workerId)) {
      console.log(`Creating new container manager for worker ${workerId}`);
      TestContainerManager.instances.set(workerId, new TestContainerManager());
    }
    return TestContainerManager.instances.get(workerId) as TestContainerManager;
  }

  private dbContainer: StartedPostgreSqlContainer | null = null;
  private dbClient: postgres.Sql<Record<string, never>> | null = null;
  private redisContainer: StartedRedisContainer | null = null;
  private kafkaContainer: StartedKafkaContainer | null = null;
  private isInitialized = false;

  private constructor() {}

  public async initialize(dbMount?: string) {
    if (this.isInitialized) {
      return this.getContainers();
    }

    const workerId = process.env.JEST_WORKER_ID || '1';
    console.log(`[Worker ${workerId}] Initializing containers...`);

    try {
      console.log(`[Worker ${workerId}] Starting PostgreSQL container...`);
      this.dbContainer = await this.startPostgresContainer(dbMount);
      console.log(
        `[Worker ${workerId}] ✓ PostgreSQL started (ID: ${this.dbContainer.getId().substring(0, 12)})`,
      );

      this.dbClient = postgres(this.dbContainer.getConnectionUri(), {
        onnotice: () => {}, // This silences all notices
        max: 1,
      });

      console.log(`[Worker ${workerId}] Starting Redis container...`);
      this.redisContainer = await this.startRedisContainer();
      console.log(
        `[Worker ${workerId}] ✓ Redis started (ID: ${this.redisContainer.getId().substring(0, 12)})`,
      );

      console.log(`[Worker ${workerId}] Starting Kafka container...`);
      this.kafkaContainer = await this.startKafkaContainer();
      console.log(
        `[Worker ${workerId}] ✓ Kafka started (ID: ${this.kafkaContainer.getId().substring(0, 12)})`,
      );

      console.log(`[Worker ${workerId}] Running database migrations...`);
      await this.executeMigrations();
      console.log(`[Worker ${workerId}] ✓ Migrations completed`);

      this.isInitialized = true;
      console.log(
        `[Worker ${workerId}] ✓ All containers initialized successfully`,
      );
      return this.getContainers();
    } catch (error) {
      console.error(
        `[Worker ${workerId}] ✗ Error initializing containers:`,
        error,
      );
      await this.cleanup();
      throw error;
    }
  }

  public async cleanup() {
    try {
      if (this.dbClient) {
        console.log(
          `Closing db client for worker ${process.env.JEST_WORKER_ID || '1'}`,
        );
        await this.dbClient.end();
        this.dbClient = null;
      }

      if (this.dbContainer) {
        console.log(
          `Stopping db container for worker ${process.env.JEST_WORKER_ID || '1'}`,
        );
        await this.dbContainer.stop();
        this.dbContainer = null;
      }

      if (this.redisContainer) {
        console.log(
          `Stopping redis container for worker ${process.env.JEST_WORKER_ID || '1'}`,
        );
        await this.redisContainer.stop();
        this.redisContainer = null;
      }

      if (this.kafkaContainer) {
        console.log(
          `Stopping kafka container for worker ${process.env.JEST_WORKER_ID || '1'}`,
        );
        await this.kafkaContainer.stop();
        this.kafkaContainer = null;
      }

      this.isInitialized = false;
      const workerId = process.env.JEST_WORKER_ID || '1';
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      TestContainerManager.instances.delete(workerId);
    } catch (error) {
      console.error(
        `Error cleaning up containers for worker ${process.env.JEST_WORKER_ID || '1'}:`,
        error,
      );
      throw error;
    }
  }

  public getKafkaBrokers(): string {
    if (!this.isInitialized || !this.kafkaContainer) {
      throw new Error('Kafka container not initialized');
    }
    const kafkaHost = this.kafkaContainer.getHost();
    const kafkaPort = this.kafkaContainer.getMappedPort(9093);
    return `${kafkaHost}:${kafkaPort}`;
  }

  public async runMigrations() {
    if (!this.isInitialized) {
      throw new Error('Test containers not initialized');
    }
    return this.executeMigrations();
  }

  private async executeMigrations() {
    const db = drizzle(this.dbClient!, { schema });
    const { data, error } = await tryCatch(
      migrate(db, {
        migrationsFolder: join(__dirname, '../../src/database/migrations'),
      }),
    );

    if (error) {
      console.error(`Migration failed with error`, error);
      throw error;
    }

    return data;
  }

  private async startPostgresContainer(
    dbMount: string | undefined,
  ): Promise<StartedPostgreSqlContainer> {
    const workerId = process.env.JEST_WORKER_ID || '1';
    return await new PostgreSqlContainer(`${pgImage}:${dbVersion}`)
      .withUsername(dbConfigObj.username)
      .withPassword(dbConfigObj.password)
      .withDatabase(dbConfigObj.database)
      .withExposedPorts(5432)
      .withName(`test-token-price-postgres-${workerId}`)
      .withBindMounts(
        dbMount
          ? [
              {
                source: dbMount,
                target: '/var/lib/postgresql/data',
              },
            ]
          : [],
      )
      .start();
  }

  private async startRedisContainer(): Promise<StartedRedisContainer> {
    const workerId = process.env.JEST_WORKER_ID || '1';
    return await new RedisContainer('redis:alpine')
      .withExposedPorts(redisConfigObj.port)
      .withName(`test-token-price-redis-${workerId}`)
      .start();
  }

  private async startKafkaContainer(): Promise<StartedKafkaContainer> {
    const workerId = process.env.JEST_WORKER_ID || '1';
    const container = await new KafkaContainer('confluentinc/cp-kafka:7.3.0')
      .withName(`test-token-price-kafka-${workerId}`)
      .withEnvironment({
        KAFKA_BROKER_ID: '1',
        KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
        KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true',
      })
      .withExposedPorts(9093)
      .start();

    return container;
  }

  private getContainers() {
    if (!this.isInitialized) {
      throw new Error('Test containers not initialized');
    }
    return {
      dbContainer: this.dbContainer!,
      dbClient: this.dbClient!,
      redisContainer: this.redisContainer!,
      kafkaContainer: this.kafkaContainer!,
    };
  }
}

export default TestContainerManager;
