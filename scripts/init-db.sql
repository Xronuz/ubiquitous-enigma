-- EduPlatform database initialization
-- This runs once on first PostgreSQL container start

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- Note: Row Level Security (RLS) policies are applied via Prisma migrations
-- See: apps/backend/prisma/migrations/

-- Create app settings for RLS
-- These are set per-request by the NestJS middleware:
-- SET LOCAL app.current_school_id = '<uuid>';
-- SET LOCAL app.is_super_admin = 'true';
