-- CreateEnum
CREATE TYPE "AcademicEventType" AS ENUM ('holiday', 'exam_week', 'quarter_start', 'quarter_end', 'school_event', 'meeting', 'other');

-- CreateTable
CREATE TABLE "academic_events" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AcademicEventType" NOT NULL DEFAULT 'other',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_events_schoolId_startDate_idx" ON "academic_events"("schoolId", "startDate");

-- AddForeignKey
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_events" ADD CONSTRAINT "academic_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
