/*
  Warnings:

  - Added the required column `updatedAt` to the `Stock` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "SaleDetail" DROP CONSTRAINT "SaleDetail_saleId_fkey";

-- DropIndex
DROP INDEX "Product_barcode_idx";

-- DropIndex
DROP INDEX "Product_id_idx";

-- DropIndex
DROP INDEX "Stock_productId_warehouseId_idx";

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleDetail" ADD CONSTRAINT "SaleDetail_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
