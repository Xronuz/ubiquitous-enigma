-- ============================================================
-- Migration: 20260420000001_add_multi_branch
-- Description: Multi-branch foundation
--   1. UserRole enum ga branch_admin qo'shish
--   2. branches jadvali
--   3. branch_modules jadvali (filial darajasida feature flags)
--   4. Asosiy jadvallar ga branch_id (nullable FK) qo'shish:
--      users, classes, attendance, grades, payments,
--      leave_requests, staff_salaries, courses, clubs,
--      transport_routes
-- ============================================================

-- Step 1: Enum yangilash (PostgreSQL ALTER TYPE)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'branch_admin';

-- Step 2: branches jadvali
CREATE TABLE "branches" (
    "id"         TEXT         NOT NULL,
    "schoolId"   TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "code"       TEXT,
    "address"    TEXT,
    "phone"      TEXT,
    "email"      TEXT,
    "isActive"   BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branches_schoolId_name_key" ON "branches"("schoolId", "name");
CREATE INDEX "branches_schoolId_idx" ON "branches"("schoolId");

ALTER TABLE "branches"
    ADD CONSTRAINT "branches_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: branch_modules jadvali
CREATE TABLE "branch_modules" (
    "id"          TEXT         NOT NULL,
    "branchId"    TEXT         NOT NULL,
    "moduleName"  "ModuleName" NOT NULL,
    "isEnabled"   BOOLEAN      NOT NULL DEFAULT false,
    "configJson"  JSONB,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "updatedBy"   TEXT,

    CONSTRAINT "branch_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "branch_modules_branchId_moduleName_key"
    ON "branch_modules"("branchId", "moduleName");
CREATE INDEX "branch_modules_branchId_idx" ON "branch_modules"("branchId");

ALTER TABLE "branch_modules"
    ADD CONSTRAINT "branch_modules_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4a: users — branch_id qo'shish
ALTER TABLE "users" ADD COLUMN "branchId" TEXT;
ALTER TABLE "users"
    ADD CONSTRAINT "users_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "users_branchId_idx" ON "users"("branchId");

-- Step 4b: classes — branch_id qo'shish
ALTER TABLE "classes" ADD COLUMN "branchId" TEXT;
ALTER TABLE "classes"
    ADD CONSTRAINT "classes_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "classes_branchId_idx" ON "classes"("branchId");

-- Step 4c: attendance — branch_id qo'shish (denormalized for perf)
ALTER TABLE "attendance" ADD COLUMN "branchId" TEXT;
ALTER TABLE "attendance"
    ADD CONSTRAINT "attendance_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "attendance_branchId_idx" ON "attendance"("branchId");

-- Step 4d: grades — branch_id qo'shish (denormalized for perf)
ALTER TABLE "grades" ADD COLUMN "branchId" TEXT;
ALTER TABLE "grades"
    ADD CONSTRAINT "grades_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "grades_branchId_idx" ON "grades"("branchId");

-- Step 4e: payments — branch_id qo'shish
ALTER TABLE "payments" ADD COLUMN "branchId" TEXT;
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "payments_branchId_status_idx" ON "payments"("branchId", "status");

-- Step 4f: leave_requests — branch_id qo'shish
ALTER TABLE "leave_requests" ADD COLUMN "branchId" TEXT;
ALTER TABLE "leave_requests"
    ADD CONSTRAINT "leave_requests_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4g: staff_salaries — branch_id qo'shish
ALTER TABLE "staff_salaries" ADD COLUMN "branchId" TEXT;
ALTER TABLE "staff_salaries"
    ADD CONSTRAINT "staff_salaries_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4h-pre: Create missing tables that were in schema but had no migration
-- ClubCategory enum
DO $$ BEGIN
    CREATE TYPE "ClubCategory" AS ENUM ('sport', 'art', 'science', 'music', 'tech', 'language', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- courses table (branchId added below, scope added in later migration)
CREATE TABLE IF NOT EXISTS "courses" (
    "id"          TEXT         NOT NULL,
    "schoolId"    TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "teacherId"   TEXT,
    "duration"    INTEGER,
    "price"       DOUBLE PRECISION,
    "maxStudents" INTEGER      NOT NULL DEFAULT 30,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "startDate"   TIMESTAMP(3),
    "endDate"     TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "courses_schoolId_idx" ON "courses"("schoolId");
ALTER TABLE "courses"
    ADD CONSTRAINT "courses_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- course_enrollments table
CREATE TABLE IF NOT EXISTS "course_enrollments" (
    "id"         TEXT         NOT NULL,
    "schoolId"   TEXT         NOT NULL,
    "courseId"   TEXT         NOT NULL,
    "studentId"  TEXT         NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"     TEXT         NOT NULL DEFAULT 'active',
    "grade"      DOUBLE PRECISION,
    "notes"      TEXT,
    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "course_enrollments_courseId_studentId_key" UNIQUE ("courseId", "studentId")
);
CREATE INDEX IF NOT EXISTS "course_enrollments_schoolId_idx"  ON "course_enrollments"("schoolId");
CREATE INDEX IF NOT EXISTS "course_enrollments_studentId_idx" ON "course_enrollments"("studentId");
ALTER TABLE "course_enrollments"
    ADD CONSTRAINT "course_enrollments_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "course_enrollments"
    ADD CONSTRAINT "course_enrollments_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "course_enrollments"
    ADD CONSTRAINT "course_enrollments_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
;

-- clubs table (branchId added below)
CREATE TABLE IF NOT EXISTS "clubs" (
    "id"          TEXT            NOT NULL,
    "schoolId"    TEXT            NOT NULL,
    "name"        TEXT            NOT NULL,
    "description" TEXT,
    "category"    "ClubCategory"  NOT NULL DEFAULT 'other',
    "leaderId"    TEXT            NOT NULL,
    "schedule"    TEXT,
    "maxMembers"  INTEGER,
    "isActive"    BOOLEAN         NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "clubs_schoolId_idx" ON "clubs"("schoolId");
ALTER TABLE "clubs"
    ADD CONSTRAINT "clubs_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "clubs"
    ADD CONSTRAINT "clubs_leaderId_fkey"
    FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
;

-- club_members table
CREATE TABLE IF NOT EXISTS "club_members" (
    "id"        TEXT         NOT NULL,
    "clubId"    TEXT         NOT NULL,
    "studentId" TEXT         NOT NULL,
    "joinedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_members_clubId_studentId_key" UNIQUE ("clubId", "studentId")
);
CREATE INDEX IF NOT EXISTS "club_members_studentId_idx" ON "club_members"("studentId");
ALTER TABLE "club_members"
    ADD CONSTRAINT "club_members_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "club_members"
    ADD CONSTRAINT "club_members_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
;

-- transport_routes table (branchId added below)
CREATE TABLE IF NOT EXISTS "transport_routes" (
    "id"            TEXT         NOT NULL,
    "schoolId"      TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "description"   TEXT,
    "stops"         JSONB        NOT NULL DEFAULT '[]',
    "departureTime" TEXT         NOT NULL,
    "arrivalTime"   TEXT         NOT NULL,
    "driverName"    TEXT,
    "driverPhone"   TEXT,
    "vehicleNumber" TEXT,
    "capacity"      INTEGER      NOT NULL DEFAULT 30,
    "isActive"      BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transport_routes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transport_routes_schoolId_name_key" UNIQUE ("schoolId", "name")
);
CREATE INDEX IF NOT EXISTS "transport_routes_schoolId_idx" ON "transport_routes"("schoolId");
ALTER TABLE "transport_routes"
    ADD CONSTRAINT "transport_routes_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
;

-- transport_students table
CREATE TABLE IF NOT EXISTS "transport_students" (
    "id"        TEXT         NOT NULL,
    "schoolId"  TEXT         NOT NULL,
    "routeId"   TEXT         NOT NULL,
    "studentId" TEXT         NOT NULL,
    "stopName"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transport_students_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transport_students_routeId_studentId_key" UNIQUE ("routeId", "studentId")
);
CREATE INDEX IF NOT EXISTS "transport_students_schoolId_idx"  ON "transport_students"("schoolId");
CREATE INDEX IF NOT EXISTS "transport_students_studentId_idx" ON "transport_students"("studentId");
ALTER TABLE "transport_students"
    ADD CONSTRAINT "transport_students_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "transport_students"
    ADD CONSTRAINT "transport_students_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "transport_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE
;
ALTER TABLE "transport_students"
    ADD CONSTRAINT "transport_students_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
;

-- Step 4h: courses — branch_id qo'shish
ALTER TABLE "courses" ADD COLUMN "branchId" TEXT;
ALTER TABLE "courses"
    ADD CONSTRAINT "courses_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "courses_branchId_idx" ON "courses"("branchId");

-- Step 4i: clubs — branch_id qo'shish
ALTER TABLE "clubs" ADD COLUMN "branchId" TEXT;
ALTER TABLE "clubs"
    ADD CONSTRAINT "clubs_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "clubs_branchId_idx" ON "clubs"("branchId");

-- Step 4j: transport_routes — branch_id qo'shish
ALTER TABLE "transport_routes" ADD COLUMN "branchId" TEXT;
ALTER TABLE "transport_routes"
    ADD CONSTRAINT "transport_routes_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "transport_routes_branchId_idx" ON "transport_routes"("branchId");
