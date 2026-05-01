/**
 * Sentry Configuration Template
 *
 * O'rnatish:
 *   1. npm install @sentry/nestjs @sentry/node
 *   2. `SENTRY_DSN` env var sozlash
 *   3. `app.module.ts` da `SentryModule.forRoot()` import qilish
 *   4. `main.ts` da `Sentry.setupNestErrorHandler(app, new BaseExceptionFilter())` chaqirish
 *
 * Hujjat: https://docs.sentry.io/platforms/javascript/guides/nestjs/
 */

import { ConfigService } from '@nestjs/config';

export function getSentryConfig(config: ConfigService) {
  const dsn = config.get<string>('SENTRY_DSN');
  const environment = config.get<string>('NODE_ENV') || 'development';

  if (!dsn) {
    return null; // Sentry o'chirilgan
  }

  return {
    dsn,
    environment,
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Error sampling
    sampleRate: 1.0,
    // Release version (Docker image tag yoki git commit hash)
    release: config.get<string>('SENTRY_RELEASE') || 'unknown',
    // Attach user context to errors
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.authorization;
      }
      return event;
    },
  };
}
