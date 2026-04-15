import * as Joi from 'joi';

/**
 * Environment variable validation schema.
 * App startup fails fast with a clear error if required vars are missing or invalid.
 */
export const envValidationSchema = Joi.object({
  // ─── Database ──────────────────────────────────────────────────────────────
  DATABASE_URL: Joi.string().uri().required(),

  // ─── Redis ─────────────────────────────────────────────────────────────────
  REDIS_HOST:     Joi.string().default('localhost'),
  REDIS_PORT:     Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB:       Joi.number().min(0).max(15).default(0),

  // ─── JWT ───────────────────────────────────────────────────────────────────
  JWT_SECRET:         Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),

  // ─── App ───────────────────────────────────────────────────────────────────
  PORT:      Joi.number().port().default(3001),
  NODE_ENV:  Joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),

  // ─── CORS ──────────────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  THROTTLE_TTL:   Joi.number().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().positive().default(100),

  // ─── MinIO / S3 ────────────────────────────────────────────────────────────
  MINIO_ENDPOINT:   Joi.string().default('localhost'),
  MINIO_PORT:       Joi.number().port().default(9000),
  MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
  MINIO_SECRET_KEY: Joi.string().default('minioadmin'),
  MINIO_BUCKET:     Joi.string().default('eduplatform'),
  MINIO_USE_SSL:    Joi.boolean().default(false),

  // ─── SMS (Infobip) ─────────────────────────────────────────────────────────
  INFOBIP_API_KEY:  Joi.string().allow('').optional(),
  INFOBIP_BASE_URL: Joi.string().uri().allow('').optional(),
  SMS_FROM:         Joi.string().default('EduPlatform'),

  // ─── Payment providers ─────────────────────────────────────────────────────
  PAYME_MERCHANT_ID: Joi.string().allow('').optional(),
  PAYME_SECRET_KEY:  Joi.string().allow('').optional(),
  CLICK_MERCHANT_ID: Joi.string().allow('').optional(),
  CLICK_SECRET_KEY:  Joi.string().allow('').optional(),
});
