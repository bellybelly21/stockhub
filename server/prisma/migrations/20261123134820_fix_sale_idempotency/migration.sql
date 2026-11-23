/*
  Warnings:

  - A unique constraint covering the columns `[sellerId,idempotencyKey]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `payloadHash` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Made the column `idempotencyKey` on table `Sale` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Sale_idempotencyKey_key";

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "payloadHash" TEXT NOT NULL,
ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_sellerId_idempotencyKey_key" ON "Sale"("sellerId", "idempotencyKey");
