-- Migration: Add branchId to Exam, Homework, Subject, DisciplineIncident, FeeStructure, Notification
-- and add indexes to User, Class, Grade, Attendance, Homework tables

-- ─── 1. Exam ──────────────────────────────────────────────────────────────
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "exams" ADD CONSTRAINT "exams_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "exams_schoolId_branchId_idx" ON "exams"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "exams_branchId_idx" ON "exams"("branchId");

-- ─── 2. Homework ──────────────────────────────────────────────────────────
ALTER TABLE "homeworks" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "homeworks_schoolId_branchId_idx" ON "homeworks"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "homeworks_branchId_idx" ON "homeworks"("branchId");

-- ─── 3. Subject ───────────────────────────────────────────────────────────
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "subjects_schoolId_branchId_idx" ON "subjects"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "subjects_branchId_idx" ON "subjects"("branchId");

-- ─── 4. DisciplineIncident ────────────────────────────────────────────────
ALTER TABLE "discipline_incidents" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "discipline_incidents_schoolId_branchId_idx" ON "discipline_incidents"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "discipline_incidents_branchId_idx" ON "discipline_incidents"("branchId");

-- ─── 5. FeeStructure ──────────────────────────────────────────────────────
ALTER TABLE "fee_structures" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "fee_structures_schoolId_branchId_idx" ON "fee_structures"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "fee_structures_branchId_idx" ON "fee_structures"("branchId");

-- ─── 6. Notification ──────────────────────────────────────────────────────
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "notifications_schoolId_branchId_idx" ON "notifications"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "notifications_branchId_idx" ON "notifications"("branchId");

-- ─── 7. User (branchId already exists, add new indexes) ───────────────────
CREATE INDEX IF NOT EXISTS "users_schoolId_branchId_idx" ON "users"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "users_branchId_idx" ON "users"("branchId");
CREATE INDEX IF NOT EXISTS "users_schoolId_role_isActive_idx" ON "users"("schoolId", "role", "isActive");

-- ─── 8. Class (branchId already exists, just add indexes) ─────────────────
CREATE INDEX IF NOT EXISTS "classes_schoolId_branchId_idx" ON "classes"("schoolId", "branchId");
CREATE INDEX IF NOT EXISTS "classes_branchId_idx" ON "classes"("branchId");

-- ─── 9. Grade (performance indexes) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS "grades_classId_date_idx" ON "grades"("classId", "date");
CREATE INDEX IF NOT EXISTS "grades_studentId_date_idx" ON "grades"("studentId", "date");

-- ─── 10. Attendance (performance indexes) ─────────────────────────────────
CREATE INDEX IF NOT EXISTS "attendance_studentId_date_idx" ON "attendance"("studentId", "date");

-- ─── 11. Homework (performance index) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS "homeworks_classId_status_idx" ON "homeworks"("classId", "status");
