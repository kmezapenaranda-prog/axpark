process.env.TZ = 'America/Bogota';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DateFormatterInterceptor } from './common/interceptors/date-formatter.interceptor';

/** En producción no se arranca con secretos de ejemplo: mejor fallar que quedar expuesto. */
function assertProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < 32 || secret === 'changeme') {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres y no ser "changeme" en producción.');
  }
  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN es obligatorio en producción (URL del frontend).');
  }
}

async function bootstrap() {
  assertProductionConfig();
  const app = await NestFactory.create(AppModule);
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: corsOrigins });
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new DateFormatterInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AxPark API')
    .setDescription('API de gestión de parqueaderos')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-detector-key', in: 'header' }, 'detector-key')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`AxPark API corriendo en http://localhost:${port}`);
  console.log(`Documentación Swagger en http://localhost:${port}/docs`);
}
bootstrap();
