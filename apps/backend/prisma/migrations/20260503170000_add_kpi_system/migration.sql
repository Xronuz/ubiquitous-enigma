-- CreateEnum
CREATE TYPE "KpiCategory" AS ENUM ('STRATEGY', 'ACADEMIC', 'TEACHER', 'STUDENT', 'MARKETING', 'FINANCE', 'OPERATIONS', 'AI_IT', 'BRANDING', 'MONITORING');

-- CreateEnum
CREATE TYPE "KpiPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateTable
CREATE TABLE "kpi_metrics" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "KpiCategory" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '%',
    "period" "KpiPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_records" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kpi_metrics_schoolId_idx" ON "kpi_metrics"("schoolId");

-- CreateIndex
CREATE INDEX "kpi_metrics_schoolId_category_idx" ON "kpi_metrics"("schoolId", "category");

-- CreateIndex
CREATE INDEX "kpi_metrics_schoolId_branchId_idx" ON "kpi_metrics"("schoolId", "branchId");

-- CreateIndex
CREATE INDEX "kpi_records_metricId_idx" ON "kpi_records"("metricId");

-- CreateIndex
CREATE INDEX "kpi_records_metricId_periodStart_idx" ON "kpi_records"("metricId", "periodStart");

-- CreateIndex
CREATE INDEX "kpi_records_metricId_periodEnd_idx" ON "kpi_records"("metricId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_records_metricId_periodStart_key" ON "kpi_records"("metricId", "periodStart");

-- AddForeignKey
ALTER TABLE "kpi_metrics" ADD CONSTRAINT "kpi_metrics_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_metrics" ADD CONSTRAINT "kpi_metrics_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "kpi_metrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_records" ADD CONSTRAINT "kpi_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
