-- ============================================================
-- Migration: 20260425000002_add_coin_transactions
-- Description: Gamification coin transaction ledger table
-- ============================================================

CREATE TABLE "coin_transactions" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "schoolId"  TEXT        NOT NULL,
    "amount"    INTEGER     NOT NULL,
    "type"      TEXT        NOT NULL,
    "reason"    TEXT        NOT NULL,
    "balance"   INTEGER     NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "coin_transactions_userId_idx"          ON "coin_transactions"("userId");
CREATE INDEX "coin_transactions_schoolId_idx"         ON "coin_transactions"("schoolId");
CREATE INDEX "coin_transactions_userId_schoolId_idx"  ON "coin_transactions"("userId", "schoolId");

-- Foreign keys
ALTER TABLE "coin_transactions"
    ADD CONSTRAINT "coin_transactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coin_transactions"
    ADD CONSTRAINT "coin_transactions_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
