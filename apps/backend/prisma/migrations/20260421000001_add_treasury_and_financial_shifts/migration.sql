-- Phase 3: Treasury & Financial Shifts
-- Adds: FinanceType enum, TreasuryType enum, ShiftStatus enum
--       treasuries table, financial_shifts table
--       schools.financeType column
--       payments.treasuryId + payments.shiftId columns

-- ── 1. Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "FinanceType" AS ENUM ('CENTRALIZED', 'DECENTRALIZED');
CREATE TYPE "TreasuryType" AS ENUM ('CASH', 'BANK');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- ── 2. Alter schools — add financeType column ─────────────────────────────────

ALTER TABLE "schools"
  ADD COLUMN "financeType" "FinanceType" NOT NULL DEFAULT 'CENTRALIZED';

-- ── 3. Create treasuries table ────────────────────────────────────────────────

CREATE TABLE "treasuries" (
  "id"        TEXT             NOT NULL,
  "schoolId"  TEXT             NOT NULL,
  "branchId"  TEXT,
  "name"      TEXT             NOT NULL,
  "type"      "TreasuryType"   NOT NULL DEFAULT 'CASH',
  "balance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"  TEXT             NOT NULL DEFAULT 'UZS',
  "isActive"  BOOLEAN          NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "treasuries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "treasuries_schoolId_branchId_idx" ON "treasuries"("schoolId", "branchId");
CREATE INDEX "treasuries_schoolId_type_idx"     ON "treasuries"("schoolId", "type");

ALTER TABLE "treasuries"
  ADD CONSTRAINT "treasuries_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "treasuries_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL;

-- ── 4. Create financial_shifts table ──────────────────────────────────────────

CREATE TABLE "financial_shifts" (
  "id"               TEXT             NOT NULL,
  "schoolId"         TEXT             NOT NULL,
  "branchId"         TEXT,
  "treasuryId"       TEXT             NOT NULL,
  "openerId"         TEXT             NOT NULL,
  "closerId"         TEXT,
  "startTime"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endTime"          TIMESTAMP(3),
  "startingBalance"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expectedBalance"  DOUBLE PRECISION,
  "actualBalance"    DOUBLE PRECISION,
  "discrepancy"      DOUBLE PRECISION,
  "status"           "ShiftStatus"    NOT NULL DEFAULT 'OPEN',
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "financial_shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_shifts_schoolId_status_idx"   ON "financial_shifts"("schoolId", "status");
CREATE INDEX "financial_shifts_branchId_status_idx"   ON "financial_shifts"("branchId", "status");
CREATE INDEX "financial_shifts_treasuryId_status_idx" ON "financial_shifts"("treasuryId", "status");

ALTER TABLE "financial_shifts"
  ADD CONSTRAINT "financial_shifts_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "financial_shifts_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "financial_shifts_treasuryId_fkey"
    FOREIGN KEY ("treasuryId") REFERENCES "treasuries"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "financial_shifts_openerId_fkey"
    FOREIGN KEY ("openerId") REFERENCES "users"("id"),
  ADD CONSTRAINT "financial_shifts_closerId_fkey"
    FOREIGN KEY ("closerId") REFERENCES "users"("id");

-- ── 5. Alter payments — add treasuryId and shiftId ───────────────────────────

ALTER TABLE "payments"
  ADD COLUMN "treasuryId" TEXT,
  ADD COLUMN "shiftId"    TEXT;

CREATE INDEX "payments_treasuryId_idx" ON "payments"("treasuryId");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_treasuryId_fkey"
    FOREIGN KEY ("treasuryId") REFERENCES "treasuries"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "payments_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "financial_shifts"("id") ON DELETE SET NULL;
