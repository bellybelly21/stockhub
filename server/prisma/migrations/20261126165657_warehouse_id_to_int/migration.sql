-- DropIndex
DROP INDEX "Product_barcode_idx";

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "updatedAt" DROP DEFAULT;
