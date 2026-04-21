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
  "school_id"           TEXT         NOT NULL,
  "branch_id"           TEXT,
  "first_name"          TEXT         NOT NULL,
  "last_name"           TEXT         NOT NULL,
  "phone"               TEXT         NOT NULL,
  "source"              "LeadSource" NOT NULL DEFAULT 'OTHER',
  "status"              "LeadStatus" NOT NULL DEFAULT 'NEW',
  "note"                TEXT,
  "assigned_to_id"      TEXT,
  "created_by_id"       TEXT,
  "converted_student_id" TEXT,         -- User.id dan olinadi (convert qilinganda)
  "expected_class_id"   TEXT,          -- Qaysi sinfga/guruhga mo'ljallangan
  "next_contact_date"   TIMESTAMP(3),
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- phone + school_id → bitta maktabda bitta telefon faqat bitta lead
CREATE UNIQUE INDEX "leads_school_id_phone_key"   ON "leads"("school_id", "phone");
CREATE INDEX "leads_school_id_status_idx"          ON "leads"("school_id", "status");
CREATE INDEX "leads_school_id_branch_id_idx"       ON "leads"("school_id", "branch_id");
CREATE INDEX "leads_school_id_source_idx"          ON "leads"("school_id", "source");
CREATE INDEX "leads_assigned_to_id_idx"            ON "leads"("assigned_to_id");

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "leads_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "leads_assigned_to_id_fkey"
    FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "leads_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- ── 3. Create lead_comments table ────────────────────────────────────────────

CREATE TABLE "lead_comments" (
  "id"         TEXT         NOT NULL,
  "lead_id"    TEXT         NOT NULL,
  "school_id"  TEXT         NOT NULL,
  "author_id"  TEXT,
  "text"       TEXT         NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lead_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_comments_lead_id_idx"   ON "lead_comments"("lead_id");
CREATE INDEX "lead_comments_school_id_idx" ON "lead_comments"("school_id");

ALTER TABLE "lead_comments"
  ADD CONSTRAINT "lead_comments_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "lead_comments_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "lead_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;
