-- Phase 5: CRM Lead Management System
-- Adds: LeadSource enum, LeadStatus enum, leads table, lead_comments table

-- ── 1. New enums ──────────────────────────────────────────────────────────────

CREATE TYPE "LeadSource" AS ENUM (
  'INSTAGRAM', 'TELEGRAM', 'FACEBOOK', 'WEBSITE', 'REFERRAL', 'CALL', 'WALK_IN', 'OTHER'
);

CREATE TYPE "LeadStatus" AS ENUM (
  'NEW', 'CONTACTED', 'TEST_LESSON', 'WAITING_PAYMENT', 'CONVERTED', 'CLOSED'
);

-- ── 2. Create leads table ─────────────────────────────────────────────────────

CREATE TABLE "leads" (
  "id"                  TEXT         NOT NULL,
  "schoolId"            TEXT         NOT NULL,
  "branchId"            TEXT,
  "firstName"           TEXT         NOT NULL,
  "lastName"            TEXT         NOT NULL,
  "phone"               TEXT         NOT NULL,
  "source"              "LeadSource" NOT NULL DEFAULT 'OTHER',
  "status"              "LeadStatus" NOT NULL DEFAULT 'NEW',
  "note"                TEXT,
  "assignedToId"        TEXT,
  "createdById"         TEXT,
  "convertedStudentId"  TEXT,
  "expectedClassId"     TEXT,
  "nextContactDate"     TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leads_schoolId_phone_key"  ON "leads"("schoolId", "phone");
CREATE INDEX "leads_schoolId_status_idx"        ON "leads"("schoolId", "status");
CREATE INDEX "leads_schoolId_branchId_idx"      ON "leads"("schoolId", "branchId");
CREATE INDEX "leads_schoolId_source_idx"        ON "leads"("schoolId", "source");
CREATE INDEX "leads_assignedToId_idx"           ON "leads"("assignedToId");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "leads_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "leads_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "leads_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL;

-- ── 3. Create lead_comments table ────────────────────────────────────────────

CREATE TABLE "lead_comments" (
  "id"        TEXT         NOT NULL,
  "leadId"    TEXT         NOT NULL,
  "schoolId"  TEXT         NOT NULL,
  "authorId"  TEXT,
  "text"      TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lead_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_comments_leadId_idx"   ON "lead_comments"("leadId");
CREATE INDEX "lead_comments_schoolId_idx" ON "lead_comments"("schoolId");

ALTER TABLE "lead_comments"
  ADD CONSTRAINT "lead_comments_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "lead_comments_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "lead_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL;
