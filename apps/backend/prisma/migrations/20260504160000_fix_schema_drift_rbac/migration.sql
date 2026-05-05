-- AlterEnum
ALTER TYPE "ModuleName" ADD VALUE 'kpi';

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "fee_structures" ALTER COLUMN "branchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "schoolId" DROP NOT NULL,
ALTER COLUMN "branchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "clubs_subjectId_idx" ON "clubs"("subjectId");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
