import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node/build/src/types';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

import { otelConfigObject } from '@debridge/config/otel.config';

import { otelIgnoreRequest } from './helpers';

const prometheusExporter = new PrometheusExporter({
  port: otelConfigObject.metricsPort,
  endpoint: otelConfigObject.metricsPath,
});

// Use config for trace exporter endpoint
const traceExporter = otelConfigObject.otlpEndpoint
  ? new OTLPTraceExporter({ url: otelConfigObject.otlpEndpoint })
  : undefined;

export function runOpenTelemetry(serviceName: string): {
  shutdown: () => Promise<void>;
} {
  const otelSDK = new NodeSDK(traceConfig(serviceName));
  otelSDK.start();

  const shutdown = async () => {
    try {
      console.info('opentelemetry.shutdown');
      await otelSDK.shutdown();
    } catch (err: any) {
      if (!!err && typeof err !== 'object') {
        console.error('opentelemetry.shutdown error:', err);
      } else if (Array.isArray(err.errors)) {
        const message = (err.errors as any[])
          .map((err) => err?.message)
          .filter((i) => i)
          .join(';');
        console.error('opentelemetry.shutdown error:', message || err);
      } else {
        console.error('opentelemetry.shutdown error:', err.message || err);
      }
    }
  };

  return { shutdown };
}

function traceConfig(serviceName: string): Partial<NodeSDKConfiguration> {
  return {
    metricReader: prometheusExporter,
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      'deployment.environment.name': process.env.NODE_ENV || 'development',
    }),
    spanProcessors: traceExporter
      ? [new BatchSpanProcessor(traceExporter)]
      : [],
    contextManager: new AsyncLocalStorageContextManager(),
    views: [
      {
        instrumentName: 'http.client.*',
        attributesProcessors: [
          {
            process: (attrs) => {
              renameAttr(attrs, 'net.peer.name', 'http_client.domain');
              renameAttr(attrs, 'net.peer.port', 'http_client.port');
              renameAttr(attrs, 'http.method', 'http_client.method');
              renameAttr(attrs, 'http.status_code', 'http_client.status_code');
              renameAttr(attrs, 'http.route', 'http_client.route');
              delete attrs['http.flavor'];
              return attrs;
            },
          },
        ],
      },
      {
        instrumentName: 'http.server.*',
        attributesProcessors: [
          {
            process: (attrs) => {
              renameAttr(attrs, 'net.host.port', 'http_server.port');
              renameAttr(attrs, 'http.method', 'http_server.method');
              renameAttr(attrs, 'http.status_code', 'http_server.status_code');
              renameAttr(attrs, 'http.route', 'http_server.route');
              delete attrs['net.host.name'];
              delete attrs['net.host.port'];
              delete attrs['http.flavor'];
              delete attrs['http.scheme'];
              return attrs;
            },
          },
        ],
      },
    ],
    instrumentations: [
      new HttpInstrumentation({
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          return otelIgnoreRequest({
            url: request.url,
            method: request.method,
          });
        },
      }),
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-aws-lambda': { enabled: false },
        '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
        '@opentelemetry/instrumentation-bunyan': { enabled: false },
        '@opentelemetry/instrumentation-cassandra-driver': { enabled: false },
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-fastify': { enabled: false },
      }),
    ],
  };
}

function renameAttr(
  attrs: Record<string, any>,
  oldName: string,
  newName: string,
): void {
  if (attrs[oldName] !== undefined) {
    attrs[newName] = attrs[oldName];
    delete attrs[oldName];
  }
}
