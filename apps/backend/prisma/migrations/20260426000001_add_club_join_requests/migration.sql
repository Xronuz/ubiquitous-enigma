-- ============================================================
-- Migration: 20260426000001_add_club_join_requests
-- Description: Club join request (PENDING flow) + structured schedule fields
-- ============================================================

-- 1. Add ClubRequestStatus enum
CREATE TYPE "ClubRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 2. Add structured schedule fields to clubs
ALTER TABLE "clubs" ADD COLUMN "scheduleDays"      "DayOfWeek"[] NOT NULL DEFAULT '{}';
ALTER TABLE "clubs" ADD COLUMN "scheduleStartTime" TEXT;
ALTER TABLE "clubs" ADD COLUMN "scheduleEndTime"   TEXT;

-- 3. Create club_join_requests table
CREATE TABLE "club_join_requests" (
    "id"        TEXT                 NOT NULL,
    "clubId"    TEXT                 NOT NULL,
    "studentId" TEXT                 NOT NULL,
    "status"    "ClubRequestStatus"  NOT NULL DEFAULT 'PENDING',
    "message"   TEXT,
    "createdAt" TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_join_requests_pkey" PRIMARY KEY ("id")
);

-- 4. Indexes
CREATE UNIQUE INDEX "club_join_requests_clubId_studentId_key"
    ON "club_join_requests"("clubId", "studentId");

CREATE INDEX "club_join_requests_studentId_idx"
    ON "club_join_requests"("studentId");

CREATE INDEX "club_join_requests_clubId_status_idx"
    ON "club_join_requests"("clubId", "status");

-- 5. Foreign keys
ALTER TABLE "club_join_requests"
    ADD CONSTRAINT "club_join_requests_clubId_fkey"
    FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "club_join_requests"
    ADD CONSTRAINT "club_join_requests_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
