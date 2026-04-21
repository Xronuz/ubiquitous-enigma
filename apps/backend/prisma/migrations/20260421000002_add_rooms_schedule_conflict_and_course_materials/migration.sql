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
  "id"         TEXT         NOT NULL,
  "school_id"  TEXT         NOT NULL,
  "branch_id"  TEXT         NOT NULL,   -- Required: xona har doim bitta filialga tegishli
  "name"       TEXT         NOT NULL,
  "capacity"   INTEGER      NOT NULL DEFAULT 30,
  "floor"      INTEGER,
  "type"       TEXT         NOT NULL DEFAULT 'classroom',
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_school_id_branch_id_name_key" ON "rooms"("school_id", "branch_id", "name");
CREATE INDEX "rooms_school_id_branch_id_idx" ON "rooms"("school_id", "branch_id");

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "rooms_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE;

-- ── 4. Alter schedules — add conflict detection columns ───────────────────────

ALTER TABLE "schedules"
  ADD COLUMN "branch_id"          TEXT,
  ADD COLUMN "room_id"            TEXT,
  ADD COLUMN "start_day_min_utc"  INTEGER,
  ADD COLUMN "end_day_min_utc"    INTEGER;

CREATE INDEX "schedules_school_id_day_of_week_idx"  ON "schedules"("school_id", "day_of_week");
CREATE INDEX "schedules_teacher_id_day_of_week_idx" ON "schedules"("teacher_id", "day_of_week");
CREATE INDEX "schedules_branch_id_day_of_week_idx"  ON "schedules"("branch_id", "day_of_week");

ALTER TABLE "schedules"
  ADD CONSTRAINT "schedules_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "schedules_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL;

-- ── 5. Alter courses — add scope ──────────────────────────────────────────────

ALTER TABLE "courses"
  ADD COLUMN "scope" "CourseScope" NOT NULL DEFAULT 'GLOBAL';

CREATE INDEX "courses_school_id_scope_idx" ON "courses"("school_id", "scope");

-- ── 6. Create course_materials table ─────────────────────────────────────────

CREATE TABLE "course_materials" (
  "id"             TEXT         NOT NULL,
  "school_id"      TEXT         NOT NULL,   -- schoolId — filialdan mustaqil
  "course_id"      TEXT         NOT NULL,
  "title"          TEXT         NOT NULL,
  "description"    TEXT,
  "file_url"       TEXT,
  "type"           TEXT         NOT NULL DEFAULT 'document',
  "is_public"      BOOLEAN      NOT NULL DEFAULT true,
  "sort_order"     INTEGER      NOT NULL DEFAULT 0,
  "created_by_id"  TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "course_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_materials_school_id_idx"  ON "course_materials"("school_id");
CREATE INDEX "course_materials_course_id_idx"  ON "course_materials"("course_id");

ALTER TABLE "course_materials"
  ADD CONSTRAINT "course_materials_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "course_materials_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "course_materials_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
