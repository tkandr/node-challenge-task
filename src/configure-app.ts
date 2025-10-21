import { useContainer } from 'class-validator';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { validationOptions } from '@debridge/helpers/validation-options.helper';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters';
import { ResolvePromisesInterceptor } from './interceptors';

/**
 * We need to configure the app in the same way in both: the main app and e2e tests - that is why we have this function
 * @param app
 */
export function configureApp(app: INestApplication) {
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.enableShutdownHooks();

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe(validationOptions));

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true, // by default exclude all non exposed fields
    }),
  );
}
