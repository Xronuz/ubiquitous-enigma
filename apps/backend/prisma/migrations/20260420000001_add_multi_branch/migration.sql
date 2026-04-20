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
