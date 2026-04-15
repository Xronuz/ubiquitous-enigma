-- AlterEnum
ALTER TYPE "AdvanceStatus" ADD VALUE IF NOT EXISTS 'paid';

-- CreateEnum
CREATE TYPE "CalculationType" AS ENUM ('fixed', 'tariff_based');
CREATE TYPE "TeacherGrade" AS ENUM ('none', 'second', 'first', 'highest');
CREATE TYPE "AcademicDegree" AS ENUM ('none', 'candidate', 'doctor');
CREATE TYPE "HonorificTitle" AS ENUM ('none', 'methodist', 'teacher_of_teachers');

-- AlterTable: StaffSalary — tarification fields qo'shish
ALTER TABLE "staff_salaries"
  ADD COLUMN IF NOT EXISTS "calculationType"    "CalculationType" NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS "qualificationGrade" "TeacherGrade"    NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "educationLevel"     TEXT,
  ADD COLUMN IF NOT EXISTS "workExperienceYears" INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "academicDegree"     "AcademicDegree" NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "honorificTitle"     "HonorificTitle" NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "languageCerts"      JSONB,
  ADD COLUMN IF NOT EXISTS "weeklyLessonHours"  INTEGER          NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS "computedBaseSalary" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "computedHourlyRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "tariffBreakdownJson" JSONB;

-- CreateTable: SystemConfig
CREATE TABLE IF NOT EXISTS "system_configs" (
  "id"        TEXT         NOT NULL,
  "key"       TEXT         NOT NULL,
  "value"     JSONB        NOT NULL,
  "label"     TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,

  CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex: Attendance
CREATE INDEX IF NOT EXISTS "attendance_classId_date_idx"   ON "attendance"("classId", "date");
CREATE INDEX IF NOT EXISTS "attendance_schoolId_date_idx"  ON "attendance"("schoolId", "date");

-- CreateIndex: Grade
CREATE INDEX IF NOT EXISTS "grades_studentId_subjectId_idx" ON "grades"("studentId", "subjectId");
CREATE INDEX IF NOT EXISTS "grades_classId_type_idx"        ON "grades"("classId", "type");

-- CreateIndex: Payment
CREATE INDEX IF NOT EXISTS "payments_schoolId_status_dueDate_idx" ON "payments"("schoolId", "status", "dueDate");
CREATE INDEX IF NOT EXISTS "payments_studentId_status_idx"        ON "payments"("studentId", "status");

-- CreateIndex: AuditLog
CREATE INDEX IF NOT EXISTS "audit_logs_schoolId_createdAt_idx" ON "audit_logs"("schoolId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_schoolId_entity_idx"    ON "audit_logs"("schoolId", "entity");
