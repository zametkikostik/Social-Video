import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance?.();
  if (instance?.set) {
    instance.set('trust proxy', 1);
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const origins = [appUrl, process.env.CORS_ORIGIN].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, cb) => {
      if (
        !origin ||
        origins.some((o) => {
          try {
            return origin === o || origin.includes(new URL(o).host);
          } catch {
            return false;
          }
        })
      ) {
        cb(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const maxMb = Number(process.env.UPLOAD_MAX_MB || 2048);
  process.env.UPLOAD_MAX_BYTES = String(maxMb * 1024 * 1024);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Social-Video API on :${port} (${process.env.NODE_ENV || 'dev'})`);
}

bootstrap();
