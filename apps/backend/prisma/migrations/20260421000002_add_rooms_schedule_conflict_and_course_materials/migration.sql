-- Phase 4: Multi-branch Scheduling & Conflict Detection
-- Adds: CourseScope enum, Room model, CourseMaterial model
--       School.timezone, Course.scope
--       Schedule.branchId, Schedule.roomId, Schedule.startDayMinUtc, Schedule.endDayMinUtc

-- ── 1. New enums ──────────────────────────────────────────────────────────────

CREATE TYPE "CourseScope" AS ENUM ('GLOBAL', 'LOCAL');

-- ── 2. Alter schools — add timezone ──────────────────────────────────────────

ALTER TABLE "schools"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent';

-- ── 3. Create rooms table ─────────────────────────────────────────────────────

CREATE TABLE "rooms" (
  "id"        TEXT         NOT NULL,
  "schoolId"  TEXT         NOT NULL,
  "branchId"  TEXT         NOT NULL,
  "name"      TEXT         NOT NULL,
  "capacity"  INTEGER      NOT NULL DEFAULT 30,
  "floor"     INTEGER,
  "type"      TEXT         NOT NULL DEFAULT 'classroom',
  "isActive"  BOOLEAN      NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_schoolId_branchId_name_key" ON "rooms"("schoolId", "branchId", "name");
CREATE INDEX "rooms_schoolId_branchId_idx" ON "rooms"("schoolId", "branchId");

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "rooms_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE;

-- ── 4. Alter schedules — add conflict detection columns ───────────────────────

ALTER TABLE "schedules"
  ADD COLUMN "branchId"        TEXT,
  ADD COLUMN "roomId"          TEXT,
  ADD COLUMN "startDayMinUtc"  INTEGER,
  ADD COLUMN "endDayMinUtc"    INTEGER;

CREATE INDEX "schedules_schoolId_dayOfWeek_idx"  ON "schedules"("schoolId", "dayOfWeek");
CREATE INDEX "schedules_teacherId_dayOfWeek_idx" ON "schedules"("teacherId", "dayOfWeek");
CREATE INDEX "schedules_branchId_dayOfWeek_idx"  ON "schedules"("branchId", "dayOfWeek");

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "schedules_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL;

-- ── 5. Alter courses — add scope ──────────────────────────────────────────────

ALTER TABLE "courses"
  ADD COLUMN "scope" "CourseScope" NOT NULL DEFAULT 'GLOBAL';

CREATE INDEX "courses_schoolId_scope_idx" ON "courses"("schoolId", "scope");

-- ── 6. Create course_materials table ─────────────────────────────────────────

CREATE TABLE "course_materials" (
  "id"          TEXT         NOT NULL,
  "schoolId"    TEXT         NOT NULL,
  "courseId"    TEXT         NOT NULL,
  "title"       TEXT         NOT NULL,
  "description" TEXT,
  "fileUrl"     TEXT,
  "type"        TEXT         NOT NULL DEFAULT 'document',
  "isPublic"    BOOLEAN      NOT NULL DEFAULT true,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "course_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_materials_schoolId_idx" ON "course_materials"("schoolId");
CREATE INDEX "course_materials_courseId_idx" ON "course_materials"("courseId");

ALTER TABLE "course_materials"
  ADD CONSTRAINT "course_materials_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "course_materials_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "course_materials_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL;
