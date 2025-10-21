import 'dotenv/config';

// Initialize OpenTelemetry before any other code
import helmet from '@fastify/helmet';
import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { IAllAppConfig, IAppConfig } from '@debridge/config/index';

import { configObject as appConfig } from './config/app.config';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { swaggerSetup } from './swagger.setup';
// Initialize OpenTelemetry SDK before any other imports
import { runOpenTelemetry, runOpentelemetryForFastify } from './telemetry';

const isProduction = appConfig.nodeEnv === 'production';

// todo: rework it to use pino logger
const logLevels: LogLevel[] = isProduction
  ? ['log', 'error', 'warn']
  : ['log', 'error', 'warn', 'debug', 'verbose'];

const docsPath: string = <const>'docs';

const { shutdown: shutdownOtel } = runOpenTelemetry('token-price-service');

async function bootstrap() {
  const app: NestFastifyApplication =
    await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        logger: false,
        trustProxy: true,
      }),
      {
        bufferLogs: true,
        logger: logLevels,
      },
    );

  // Register @fastify/otel plugin for automatic HTTP instrumentation
  await runOpentelemetryForFastify(app);

  // Register helmet for security
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const configService = app.get(ConfigService<IAllAppConfig>);
  const config: IAppConfig = configService.getOrThrow('app');

  app.setGlobalPrefix(config.apiPrefix, {
    exclude: ['/'],
  });

  configureApp(app);

  // Setup Swagger documentation with basic auth
  await swaggerSetup(app);

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app);

  await app.listen(config.port, config.host);

  const logger = new Logger('Bootstrap');
  const mainAppUrl = `http://${config.host}:${config.port}`;

  logger.log(`🚀 Application is running on: ${mainAppUrl}`);
  logger.log(`🚀 Swagger is running on: ${mainAppUrl}/${docsPath}`);
  logger.log(`📊 Metrics available at: http://localhost:9323/metrics`);
}

function setupGracefulShutdown(app: NestFastifyApplication) {
  const logger = new Logger('Shutdown');

  // Handle SIGTERM signal (Docker, Kubernetes, etc.)
  process.on('SIGTERM', () => {
    logger.log('SIGTERM signal received: closing HTTP server');
    void gracefulShutdown(app, logger);
  });

  // Handle SIGINT signal (Ctrl+C)
  process.on('SIGINT', () => {
    logger.log('SIGINT signal received: closing HTTP server');
    void gracefulShutdown(app, logger);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    void gracefulShutdown(app, logger, 1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    void gracefulShutdown(app, logger, 1);
  });
}

async function gracefulShutdown(
  app: NestFastifyApplication,
  logger: Logger,
  exitCode: number = 0,
) {
  try {
    logger.log('Starting graceful shutdown...');

    // Shutdown OpenTelemetry
    await shutdownOtel();

    // Close the application (this will trigger OnModuleDestroy and OnApplicationShutdown hooks)
    await app.close();

    logger.log('Application closed successfully');
    process.exit(exitCode);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during application bootstrap:', error);
  process.exit(1);
});
