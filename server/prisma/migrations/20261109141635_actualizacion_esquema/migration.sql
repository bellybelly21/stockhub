/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[rut]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rut` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rut" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Product_id_idx" ON "Product"("id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Sale_idempotencyKey_key" ON "Sale"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_key" ON "User"("rut");
