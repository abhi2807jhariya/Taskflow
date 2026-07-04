import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Main uploads folder path
  const uploadsPath = join(process.cwd(), 'uploads');

  // Admin profile images folder
  const adminUploadsPath = join(uploadsPath, 'admin');

  // Normal user profile images folder
  const userUploadsPath = join(uploadsPath, 'user');

  // Backend start hone par folders automatically create honge
  mkdirSync(adminUploadsPath, {
    recursive: true,
  });

  mkdirSync(userUploadsPath, {
    recursive: true,
  });

  // Upload images ko browser me publicly accessible banana
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });

  app.useBodyParser('json', {
    limit: '10mb',
  });

  app.useBodyParser('urlencoded', {
    limit: '10mb',
    extended: true,
  });

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 5000;

  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}`);

  console.log(`Uploads available at http://localhost:${port}/uploads`);
}

void bootstrap();
