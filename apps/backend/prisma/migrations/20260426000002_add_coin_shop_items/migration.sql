-- CreateTable
CREATE TABLE "coin_shop_items" (
    "id"          TEXT         NOT NULL,
    "schoolId"    TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "cost"        INTEGER      NOT NULL,
    "emoji"       TEXT,
    "stock"       INTEGER,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coin_shop_items_schoolId_idx" ON "coin_shop_items"("schoolId");

-- AddForeignKey
ALTER TABLE "coin_shop_items" ADD CONSTRAINT "coin_shop_items_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
