import { get } from 'env-var';
import { registerAs } from '@nestjs/config';

interface IRedisConfigParts {
  host: string;
  port: number;
  password?: string;
  username?: string;
}

export interface IRedisConfig extends IRedisConfigParts {
  connectionString: string;
  connectTimeout: number; // Connection timeout in milliseconds
}

let connectionString;
let config: IRedisConfigParts;

if (process.env.REDIS_URL) {
  connectionString = process.env.REDIS_URL;
  const regex = /^redis:\/\/(?:([^:]+)(?::([^@]+))?@)?([^:]+):(\d+)$/;
  const match = connectionString.match(regex);
  if (!match) {
    throw new Error('Invalid Redis connection string');
  }
  const [, username, password, host, port] = match;
  config = {
    host,
    port: parseInt(port, 10),
    password,
    username,
  };
} else {
  config = {
    host: get('REDIS_HOST').required().asString(),
    port: get('REDIS_PORT').required().asPortNumber(),
    password: get('REDIS_PASSWORD').asString(),
    username: get('REDIS_USERNAME').asString(),
  };
  connectionString = `redis://${config.password ? `:${config.password}@` : ''}${config.host}:${config.port}`;
}

export const redisConfigObj: IRedisConfig = {
  connectionString,
  ...config,
  connectTimeout: get('REDIS_CONNECTION_TIMEOUT')
    .default('10000')
    .asIntPositive(),
};

export const redisConfig = registerAs<IRedisConfig>(
  'redis',
  () => redisConfigObj,
);
