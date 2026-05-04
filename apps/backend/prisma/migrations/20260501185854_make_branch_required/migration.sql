/*
  Warnings:

  - The values [school_admin,vice_principal,class_teacher,accountant,librarian,parent] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `scope` on the `courses` table. All the data in the column will be lost.
  - Made the column `branchId` on table `attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `classes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `clubs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `courses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `discipline_incidents` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `exams` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `fee_structures` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `financial_shifts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `grades` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `homeworks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `leave_requests` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `schedules` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `staff_salaries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `subjects` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `transport_routes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `treasuries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `schoolId` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `branchId` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "SubscriptionPlan" ADD VALUE 'enterprise';

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('super_admin', 'director', 'branch_admin', 'teacher', 'student');
ALTER TABLE "user_branch_assignments" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_branchId_fkey";

-- DropForeignKey
ALTER TABLE "classes" DROP CONSTRAINT "classes_branchId_fkey";

-- DropForeignKey
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_branchId_fkey";

-- DropForeignKey
ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_createdById_fkey";

-- DropForeignKey
ALTER TABLE "course_materials" DROP CONSTRAINT "course_materials_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_branchId_fkey";

-- DropForeignKey
ALTER TABLE "discipline_incidents" DROP CONSTRAINT "discipline_incidents_branchId_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_branchId_fkey";

-- DropForeignKey
ALTER TABLE "fee_structures" DROP CONSTRAINT "fee_structures_branchId_fkey";

-- DropForeignKey
ALTER TABLE "financial_shifts" DROP CONSTRAINT "financial_shifts_branchId_fkey";

-- DropForeignKey
ALTER TABLE "financial_shifts" DROP CONSTRAINT "financial_shifts_closerId_fkey";

-- DropForeignKey
ALTER TABLE "financial_shifts" DROP CONSTRAINT "financial_shifts_openerId_fkey";

-- DropForeignKey
ALTER TABLE "financial_shifts" DROP CONSTRAINT "financial_shifts_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "financial_shifts" DROP CONSTRAINT "financial_shifts_treasuryId_fkey";

-- DropForeignKey
ALTER TABLE "grades" DROP CONSTRAINT "grades_branchId_fkey";

-- DropForeignKey
ALTER TABLE "homeworks" DROP CONSTRAINT "homeworks_branchId_fkey";

-- DropForeignKey
ALTER TABLE "lead_comments" DROP CONSTRAINT "lead_comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "lead_comments" DROP CONSTRAINT "lead_comments_leadId_fkey";

-- DropForeignKey
ALTER TABLE "lead_comments" DROP CONSTRAINT "lead_comments_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_branchId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_createdById_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "leave_requests" DROP CONSTRAINT "leave_requests_branchId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_branchId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_branchId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_treasuryId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_branchId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_branchId_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_roomId_fkey";

-- DropForeignKey
ALTER TABLE "staff_salaries" DROP CONSTRAINT "staff_salaries_branchId_fkey";

-- DropForeignKey
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_branchId_fkey";

-- DropForeignKey
ALTER TABLE "transport_routes" DROP CONSTRAINT "transport_routes_branchId_fkey";

-- DropForeignKey
ALTER TABLE "treasuries" DROP CONSTRAINT "treasuries_branchId_fkey";

-- DropForeignKey
ALTER TABLE "treasuries" DROP CONSTRAINT "treasuries_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_branchId_fkey";

-- DropIndex
DROP INDEX "attendance_branchId_idx";

-- DropIndex
DROP INDEX "courses_schoolId_scope_idx";

-- DropIndex
DROP INDEX "grades_branchId_idx";

-- DropIndex
DROP INDEX "homeworks_classId_dueDate_idx";

-- AlterTable
ALTER TABLE "attendance" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "classes" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "club_join_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "clubs" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "scheduleDays" DROP DEFAULT;

-- AlterTable
ALTER TABLE "course_materials" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "courses" DROP COLUMN "scope",
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "discipline_incidents" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "fee_structures" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "financial_shifts" ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "grades" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "homeworks" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "parent_meetings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "rooms" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "schedules" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "staff_salaries" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "subjects" ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "transport_routes" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "branchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "treasuries" ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "schoolId" SET NOT NULL,
ALTER COLUMN "branchId" SET NOT NULL;

-- DropEnum
DROP TYPE "CourseScope";

-- CreateIndex
CREATE INDEX "attendance_studentId_idx" ON "attendance"("studentId");

-- CreateIndex
CREATE INDEX "attendance_schoolId_status_idx" ON "attendance"("schoolId", "status");

-- CreateIndex
CREATE INDEX "courses_schoolId_branchId_idx" ON "courses"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "financial_shifts_schoolId_branchId_idx" ON "financial_shifts"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "grades_schoolId_branchId_idx" ON "grades"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "grades_schoolId_date_idx" ON "grades"("schoolId", "date");

-- CreateIndex
CREATE INDEX "leave_requests_schoolId_status_idx" ON "leave_requests"("schoolId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_requesterId_idx" ON "leave_requests"("requesterId");

-- CreateIndex
CREATE INDEX "leave_requests_schoolId_startDate_idx" ON "leave_requests"("schoolId", "startDate");

-- CreateIndex
CREATE INDEX "schedules_schoolId_branchId_idx" ON "schedules"("schoolId", "branchId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "treasuries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "financial_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_salaries" ADD CONSTRAINT "staff_salaries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discipline_incidents" ADD CONSTRAINT "discipline_incidents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasuries" ADD CONSTRAINT "treasuries_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasuries" ADD CONSTRAINT "treasuries_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_shifts" ADD CONSTRAINT "financial_shifts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_shifts" ADD CONSTRAINT "financial_shifts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_shifts" ADD CONSTRAINT "financial_shifts_treasuryId_fkey" FOREIGN KEY ("treasuryId") REFERENCES "treasuries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_shifts" ADD CONSTRAINT "financial_shifts_openerId_fkey" FOREIGN KEY ("openerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_shifts" ADD CONSTRAINT "financial_shifts_closerId_fkey" FOREIGN KEY ("closerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_comments" ADD CONSTRAINT "lead_comments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_comments" ADD CONSTRAINT "lead_comments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_comments" ADD CONSTRAINT "lead_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
