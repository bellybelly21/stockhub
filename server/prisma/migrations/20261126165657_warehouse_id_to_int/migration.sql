-- DropIndex
DROP INDEX IF EXISTS "Product_barcode_idx";

-- AlterTable
ALTER TABLE "Stock" ALTER COLUMN "updatedAt" DROP DEFAULT;