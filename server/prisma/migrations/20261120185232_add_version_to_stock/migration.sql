/*
  Warnings:

  - The values [DONADO] on the enum `ProductStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductStatus_new" AS ENUM ('ACTIVO', 'EN_OFERTA', 'INACTIVO');
ALTER TABLE "public"."Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus_new" USING ("status"::text::"ProductStatus_new");
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
ALTER TYPE "ProductStatus_new" RENAME TO "ProductStatus";
DROP TYPE "public"."ProductStatus_old";
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'ACTIVO';
COMMIT;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "netAmount" DROP NOT NULL,
ALTER COLUMN "taxAmount" DROP NOT NULL,
ALTER COLUMN "taxStatus" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Movement_fromWarehouseId_idx" ON "Movement"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "Movement_toWarehouseId_idx" ON "Movement"("toWarehouseId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Stock_productId_warehouseId_idx" ON "Stock"("productId", "warehouseId");
