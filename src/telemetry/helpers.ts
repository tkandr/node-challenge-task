import { OTEL_METRICS_ENDPOINT } from './constants';

export function otelIgnoreRequest({
  url,
  method,
}: {
  url?: string;
  method?: string;
}): boolean {
  return (
    method === 'OPTIONS' ||
    url === '/health' ||
    url === '/api/health/live' ||
    url === '/api/health/ready' ||
    url === OTEL_METRICS_ENDPOINT
  );
}
