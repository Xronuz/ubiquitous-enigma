-- CreateTable: UserBranchAssignment
-- Foydalanuvchi bir nechta filialda ishlashi mumkin bo'lganda bu jadval kerak.
-- Masalan, o'qituvchi ikkita filialda dars beradi.

CREATE TABLE "user_branch_assignments" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "branchId"  TEXT NOT NULL,
    "role"      "UserRole" NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "user_branch_assignments_userId_branchId_key"
    ON "user_branch_assignments"("userId", "branchId");

-- CreateIndexes
CREATE INDEX "user_branch_assignments_userId_idx"    ON "user_branch_assignments"("userId");
CREATE INDEX "user_branch_assignments_branchId_idx"  ON "user_branch_assignments"("branchId");

-- AddForeignKey: userId → users
ALTER TABLE "user_branch_assignments"
    ADD CONSTRAINT "user_branch_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: branchId → branches
ALTER TABLE "user_branch_assignments"
    ADD CONSTRAINT "user_branch_assignments_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
