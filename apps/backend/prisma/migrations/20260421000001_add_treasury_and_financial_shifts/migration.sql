-- Phase 3: Treasury & Financial Shifts
-- Adds: FinanceType enum, TreasuryType enum, ShiftStatus enum
--       treasuries table, financial_shifts table
--       schools.finance_type column
--       payments.treasury_id + payments.shift_id columns

-- ── 1. Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE "FinanceType" AS ENUM ('CENTRALIZED', 'DECENTRALIZED');
CREATE TYPE "TreasuryType" AS ENUM ('CASH', 'BANK');
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- ── 2. Alter schools — add financeType column ─────────────────────────────────

ALTER TABLE "schools"
  ADD COLUMN "finance_type" "FinanceType" NOT NULL DEFAULT 'CENTRALIZED';

-- ── 3. Create treasuries table ────────────────────────────────────────────────

CREATE TABLE "treasuries" (
  "id"         TEXT          NOT NULL,
  "school_id"  TEXT          NOT NULL,
  "branch_id"  TEXT,
  "name"       TEXT          NOT NULL,
  "type"       "TreasuryType" NOT NULL DEFAULT 'CASH',
  "balance"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"   TEXT          NOT NULL DEFAULT 'UZS',
  "is_active"  BOOLEAN       NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "treasuries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "treasuries_school_id_branch_id_idx"  ON "treasuries"("school_id", "branch_id");
CREATE INDEX "treasuries_school_id_type_idx"        ON "treasuries"("school_id", "type");

ALTER TABLE "treasuries"
  ADD CONSTRAINT "treasuries_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "treasuries_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL;

-- ── 4. Create financial_shifts table ──────────────────────────────────────────

CREATE TABLE "financial_shifts" (
  "id"                TEXT         NOT NULL,
  "school_id"         TEXT         NOT NULL,
  "branch_id"         TEXT,
  "treasury_id"       TEXT         NOT NULL,
  "opener_id"         TEXT         NOT NULL,
  "closer_id"         TEXT,
  "start_time"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_time"          TIMESTAMP(3),
  "starting_balance"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expected_balance"  DOUBLE PRECISION,
  "actual_balance"    DOUBLE PRECISION,
  "discrepancy"       DOUBLE PRECISION,
  "status"            "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "financial_shifts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_shifts_school_id_status_idx"    ON "financial_shifts"("school_id", "status");
CREATE INDEX "financial_shifts_branch_id_status_idx"    ON "financial_shifts"("branch_id", "status");
CREATE INDEX "financial_shifts_treasury_id_status_idx"  ON "financial_shifts"("treasury_id", "status");

ALTER TABLE "financial_shifts"
  ADD CONSTRAINT "financial_shifts_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "financial_shifts_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "financial_shifts_treasury_id_fkey"
    FOREIGN KEY ("treasury_id") REFERENCES "treasuries"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "financial_shifts_opener_id_fkey"
    FOREIGN KEY ("opener_id") REFERENCES "users"("id"),
  ADD CONSTRAINT "financial_shifts_closer_id_fkey"
    FOREIGN KEY ("closer_id") REFERENCES "users"("id");

-- ── 5. Alter payments — add treasury_id and shift_id ─────────────────────────

ALTER TABLE "payments"
  ADD COLUMN "treasury_id" TEXT,
  ADD COLUMN "shift_id"    TEXT;

CREATE INDEX "payments_treasury_id_idx" ON "payments"("treasury_id");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_treasury_id_fkey"
    FOREIGN KEY ("treasury_id") REFERENCES "treasuries"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "payments_shift_id_fkey"
    FOREIGN KEY ("shift_id") REFERENCES "financial_shifts"("id") ON DELETE SET NULL;
