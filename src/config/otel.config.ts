import { get } from 'env-var';
import { registerAs } from '@nestjs/config';

export interface IOtelConfig {
  serviceName: string;
  serviceVersion: string;
  enabled: boolean;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  metricsPort: number;
  metricsPath: string;
  otlpEndpoint?: string;
}

export const otelConfigObject = {
  serviceName: get('OTEL_SERVICE_NAME')
    .default('token-price-service')
    .asString(),
  serviceVersion: get('OTEL_SERVICE_VERSION').default('1.0.0').asString(),
  enabled: get('OTEL_ENABLED').default('true').asBool(),
  metricsEnabled: get('OTEL_METRICS_ENABLED').default('true').asBool(),
  tracingEnabled: get('OTEL_TRACING_ENABLED').default('false').asBool(),
  metricsPort: get('OTEL_METRICS_PORT').default(9323).asPortNumber(),
  metricsPath: get('OTEL_METRICS_PATH').default('/metrics').asString(),
  otlpEndpoint: get('TEMPO_URL')
    .default('http://tempo:4318/v1/traces')
    .asString(),
};

export const otelConfig = registerAs<IOtelConfig>(
  'otel',
  () => otelConfigObject,
);
