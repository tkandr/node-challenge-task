import FastifyOtelInstrumentation from '@fastify/otel';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { otelIgnoreRequest } from './helpers';

export async function runOpentelemetryForFastify(app: NestFastifyApplication) {
  const fastifyOtel = new FastifyOtelInstrumentation({
    ignorePaths: ({ url, method }) => otelIgnoreRequest({ url, method }),
  });
  await app.register(fastifyOtel.plugin());
}
