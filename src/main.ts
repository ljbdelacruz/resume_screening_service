import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  const globalPrefix = configService.get<string>('APP_GLOBAL_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerSettings = configService.get('app.swagger') as
    | {
        enabled: boolean;
        path: string;
        title: string;
        description: string;
        version: string;
      }
    | undefined;

  let swaggerPath: string | undefined;
  if (swaggerSettings?.enabled) {
    swaggerPath = swaggerSettings.path.replace(/^\/+/, '') || 'docs';
    const swaggerConfig = new DocumentBuilder()
      .setTitle(swaggerSettings.title)
      .setDescription(swaggerSettings.description)
      .setVersion(swaggerSettings.version)
      .addTag('Resume', 'Resume analysis operations')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  const appUrl = await app.getUrl();
  logger.log(`🚀 Resume scanner API running on: ${appUrl}/${globalPrefix}`);
  if (swaggerPath) {
    logger.log(`📄 Swagger docs available at: ${appUrl}/${swaggerPath}`);
  }
}

void bootstrap();
