import fastifyBasicAuth from '@fastify/basic-auth';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { IAllAppConfig, IAppConfig } from '@debridge/config/index';

export async function swaggerSetup(app: INestApplication) {
  const configService = app.get<ConfigService<IAllAppConfig>>(ConfigService);
  const appConfig = configService.getOrThrow<IAppConfig>('app');
  const logger = new Logger('SwaggerSetup');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Debridge Token Price Service API')
    .setDescription('The Debridge Token Price Service API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Apply basic auth for swagger in production
  if (
    appConfig.nodeEnv === 'production' &&
    appConfig.swaggerLogin &&
    appConfig.swaggerPassword
  ) {
    const fastifyInstance = app
      .getHttpAdapter()
      .getInstance() as FastifyInstance;

    // Register basic auth plugin
    await fastifyInstance.register(fastifyBasicAuth, {
      validate: (
        username: string,
        password: string,
        _req: FastifyRequest,
        _reply: FastifyReply,
        done: HookHandlerDoneFunction,
      ) => {
        if (
          username === appConfig.swaggerLogin &&
          password === appConfig.swaggerPassword
        ) {
          done();
        } else {
          done(new Error('Unauthorized'));
        }
      },
      authenticate: { realm: 'Swagger Documentation' },
    });

    fastifyInstance.addHook('onRequest', (req, reply, done) => {
      if (req.routeOptions?.url?.startsWith(appConfig.swaggerRoute)) {
        try {
          return fastifyInstance.basicAuth(req, reply, done);
        } catch {
          reply.code(401).send({ error: 'Unauthorized' });
        }
      }
      done();
    });

    logger.log(
      `Swagger basic authentication enabled for /${appConfig.swaggerRoute}`,
    );
  }

  SwaggerModule.setup(appConfig.swaggerRoute, app, swaggerDocument);
}
