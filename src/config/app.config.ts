import { get } from 'env-var';
import { registerAs } from '@nestjs/config';

export interface IAppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  metricsPort: number;
  apiPrefix: string;

  swaggerRoute: string;
  swaggerLogin?: string;
  swaggerPassword?: string;
}

export const configObject = {
  nodeEnv: get('NODE_ENV')
    .default('production')
    .asEnum(['development', 'production', 'test']),
  port: get('PORT').default(3000).asPortNumber(),
  host: get('HOST').default('localhost').asString(),
  metricsPort: get('METRICS_PORT').default(9323).asPortNumber(),
  apiPrefix: get('API_PREFIX').default('api').asString(),
  swaggerRoute: get('SWAGGER_ROUTE').default('docs').asString(),
  swaggerLogin: get('SWAGGER_LOGIN').asString(),
  swaggerPassword: get('SWAGGER_PASSWORD').asString(),
};

export const appConfig = registerAs<IAppConfig>('app', () => configObject);
