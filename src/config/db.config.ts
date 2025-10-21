import { get } from 'env-var';
import { registerAs } from '@nestjs/config';

interface IDbConfigParts {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  logging: boolean;
}

export interface IDbPoolConfig {
  max: number; // Maximum number of connections in the pool
  connectionTimeout: number; // Max time to wait for an available connection (seconds)
}

export interface IDbConfig extends IDbConfigParts {
  connectionString: string;
  pool: IDbPoolConfig;
}

let connectionString;
let config: IDbConfigParts;
if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  const regex = /^(postgres(?:ql)?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
  const match = connectionString.match(regex);
  if (!match) {
    throw new Error('Invalid PostgreSQL connection string');
  }
  const [, , username, password, host, port, database] = match;
  config = {
    host,
    port: parseInt(port, 10),
    database,
    username,
    password,
    logging: get('PG_LOGGING').default('false').asBoolStrict(),
  };
} else {
  config = {
    host: get('PG_HOST').required().asString(),
    port: get('PG_PORT').required().asPortNumber(),
    database: get('PG_DATABASE').required().asString(),
    username: get('PG_USERNAME').required().asString(),
    password: get('PG_PASSWORD').required().asString(),
    logging: get('PG_LOGGING').default('false').asBoolStrict(),
  };
  connectionString = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
}

export const dbConfigObj: IDbConfig = {
  connectionString,
  ...config,
  pool: {
    max: get('PG_POOL_MAX').default('20').asIntPositive(),
    connectionTimeout: get('PG_CONNECTION_TIMEOUT')
      .default('10')
      .asIntPositive(),
  },
};

export const dbConfig = registerAs<IDbConfig>('pg', () => dbConfigObj);
