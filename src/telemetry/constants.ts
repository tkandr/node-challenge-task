import { otelConfigObject } from '@debridge/config/otel.config';

// Export constants from config for use in helpers
export const OTEL_METRICS_PORT = otelConfigObject.metricsPort;
export const OTEL_METRICS_ENDPOINT = otelConfigObject.metricsPath;
