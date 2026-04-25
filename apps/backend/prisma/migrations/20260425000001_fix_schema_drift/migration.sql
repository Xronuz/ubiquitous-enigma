-- ============================================================
-- Migration: 20260425000001_fix_schema_drift
-- Description: Phase 19 — Deep Schema Audit Fixes
--   Repairs every gap between schema.prisma and the real DB:
--   1. users.coins            — column was never added
--   2. ModuleName.clubs       — enum value was never added
--   3. DisciplineType/Severity/Action enums + discipline_incidents table
--   4. MeetingStatus/Medium enums   + parent_meetings table
--   5. courses.teacherId FK   — FK constraint was never applied
-- ============================================================

-- ── 1. users — add coins column (gamification reward points) ─────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 0;

-- ── 2. ModuleName enum — add 'clubs' value ───────────────────────────────────
-- PostgreSQL ALTER TYPE … ADD VALUE cannot run inside a transaction block;
-- Prisma wraps DDL in transactions, so we use the DO-block escape hatch.

ALTER TYPE "ModuleName" ADD VALUE IF NOT EXISTS 'clubs';

-- ── 3. Discipline enums ───────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "DisciplineType" AS ENUM (
    'behavior', 'absence', 'academic', 'dress_code', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DisciplineSeverity" AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DisciplineAction" AS ENUM (
    'warning', 'detention', 'parent_call', 'parent_meeting', 'suspension', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. discipline_incidents table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "discipline_incidents" (
  "id"           TEXT                  NOT NULL,
  "schoolId"     TEXT                  NOT NULL,
  "studentId"    TEXT                  NOT NULL,
  "reportedById" TEXT                  NOT NULL,
  "type"         "DisciplineType"      NOT NULL DEFAULT 'other',
  "severity"     "DisciplineSeverity"  NOT NULL DEFAULT 'low',
  "action"       "DisciplineAction"    NOT NULL DEFAULT 'warning',
  "description"  TEXT                  NOT NULL,
  "date"         DATE                  NOT NULL,
  "resolved"     BOOLEAN               NOT NULL DEFAULT false,
  "resolvedAt"   TIMESTAMP(3),
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "discipline_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "discipline_incidents_schoolId_date_idx"
  ON "discipline_incidents"("schoolId", "date");

CREATE INDEX IF NOT EXISTS "discipline_incidents_studentId_idx"
  ON "discipline_incidents"("studentId");

ALTER TABLE "discipline_incidents"
  ADD CONSTRAINT "discipline_incidents_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discipline_incidents_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "discipline_incidents_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 5. Meeting enums ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "MeetingStatus" AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MeetingMedium" AS ENUM ('in_person', 'phone', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. parent_meetings table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "parent_meetings" (
  "id"          TEXT            NOT NULL,
  "schoolId"    TEXT            NOT NULL,
  "teacherId"   TEXT            NOT NULL,
  "parentId"    TEXT            NOT NULL,
  "studentId"   TEXT            NOT NULL,
  "scheduledAt" TIMESTAMP(3)    NOT NULL,
  "duration"    INTEGER         NOT NULL DEFAULT 30,
  "medium"      "MeetingMedium" NOT NULL DEFAULT 'in_person',
  "status"      "MeetingStatus" NOT NULL DEFAULT 'scheduled',
  "agenda"      TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "parent_meetings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "parent_meetings_schoolId_scheduledAt_idx"
  ON "parent_meetings"("schoolId", "scheduledAt");

CREATE INDEX IF NOT EXISTS "parent_meetings_teacherId_idx"
  ON "parent_meetings"("teacherId");

CREATE INDEX IF NOT EXISTS "parent_meetings_parentId_idx"
  ON "parent_meetings"("parentId");

ALTER TABLE "parent_meetings"
  ADD CONSTRAINT "parent_meetings_schoolId_fkey"
    FOREIGN KEY ("schoolId")   REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "parent_meetings_teacherId_fkey"
    FOREIGN KEY ("teacherId")  REFERENCES "users"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "parent_meetings_parentId_fkey"
    FOREIGN KEY ("parentId")   REFERENCES "users"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "parent_meetings_studentId_fkey"
    FOREIGN KEY ("studentId")  REFERENCES "users"("id")   ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 7. courses.teacherId — add missing FK constraint ─────────────────────────
-- The column exists (created in 20260420000001_add_multi_branch) but the
-- FK was never wired.  Use DO-block to skip if constraint already exists
-- (idempotent re-run safety).

DO $$ BEGIN
  ALTER TABLE "courses"
    ADD CONSTRAINT "courses_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
