import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  // Lokal yuklangan fayllarni serve qilish (MinIO ishlatilmasa)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Global pipes and filters
  // SanitizePipe runs first — strips null bytes & C0 control chars before validation
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('EduPlatform API')
    .setDescription('Maktab boshqaruv tizimi REST API — Phase 1 & 2 & 3 stub')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    // ─── Phase 1 ────────────────────────────────────────────────────────────
    .addTag('auth', 'Autentifikatsiya (login, refresh, logout, forgot-password)')
    .addTag('users', 'Foydalanuvchilar (CRUD, me, change-password, bulk-import)')
    .addTag('classes', 'Sinflar va guruhlar')
    .addTag('subjects', 'Fanlar')
    .addTag('schedule', 'Dars jadvali (haftalik/bugungi)')
    .addTag('attendance', 'Davomat (belgilash, hisobot, tarix)')
    .addTag('grades', 'Baholar va jurnal')
    .addTag('payments', "To'lovlar (Payme/Click/naqd)")
    .addTag('notifications', 'Bildirishnomalar (in-app, SMS, push)')
    .addTag('messaging', 'Xabarlar (ichki chat)')
    .addTag('parent', 'Ota-ona portali (farzand, davomat, baholar)')
    .addTag('super-admin', 'Super admin (maktablar, modullar, subscriptions)')
    .addTag('reports', 'Hisobotlar (davomat, baholar, moliya)')
    .addTag('health', 'Health check (liveness, readiness)')
    .addTag('upload', 'Fayl yuklash (avatar, hujjatlar)')
    // ─── Phase 2 ────────────────────────────────────────────────────────────
    .addTag('exams', 'Imtihonlar (CRUD, nashr, natijalar, bulk-create)')
    .addTag('homework', "Uy vazifalari (CRUD, topshirish, baholash)")
    .addTag('library', 'Kutubxona (kitoblar, berib-olish, statistika)')
    .addTag('leave-requests', "Ta'til so'rovlari (yuborish, tasdiqlash)")
    .addTag('payroll', 'Maosh tizimi (salary, advance, payroll)')
    .addTag('display', 'Zal monitoru (public — auth talab qilinmaydi)')
    .addTag('learning-center', "O'quv markazi (kurslar, yo'nalishlar, guruhlar — Phase 2 stub)")
    // ─── Phase 3 stub ───────────────────────────────────────────────────────
    .addTag('canteen', 'Ovqatxona menyusi (haftalik menyu)')
    .addTag('transport', 'Transport marshrut stub (Phase 3)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 EduPlatform API: http://localhost:${port}/api/docs`);
}

bootstrap();
