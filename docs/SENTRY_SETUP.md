# Sentry Error Tracking Setup

## 1. Package o'rnatish

```bash
cd apps/backend
npm install @sentry/nestjs @sentry/node
```

## 2. Environment variables

`.env` fayliga qo'shing:

```env
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_RELEASE=1.0.0
```

## 3. AppModule'ga SentryModule qo'shish

```typescript
import { SentryModule } from '@sentry/nestjs';
import { getSentryConfig } from './common/sentry/sentry.config';

@Module({
  imports: [
    SentryModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getSentryConfig(config),
    }),
    // ... boshqa modullar
  ],
})
export class AppModule {}
```

## 4. Global exception handler

```typescript
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

// app.module.ts providers ichida:
{ provide: APP_FILTER, useClass: SentryGlobalFilter }
```

## 5. Health check'da Sentry status

Health check javobiga `sentry: configured` qo'shish mumkin.
