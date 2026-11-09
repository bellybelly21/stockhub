/*
  Warnings:

  - The values [TRANSFERENCIA] on the enum `MovementType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isActive` on the `Sale` table. All the data in the column will be lost.
  - Added the required column `netAmount` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxAmount` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDIENTE', 'EN_TRANSITO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BOLETA_ELECTRONICA', 'FACTURA_ELECTRONICA', 'TICKET_INTERNO');

-- CreateEnum
CREATE TYPE "TaxStatus" AS ENUM ('PENDIENTE', 'EMITIDO', 'RECHAZADO', 'ANULADO');

-- AlterEnum
BEGIN;
CREATE TYPE "MovementType_new" AS ENUM ('INGRESO', 'VENTA', 'TRANSFERENCIA_SALIDA', 'TRANSFERENCIA_ENTRADA', 'MERMA', 'AJUSTE', 'ANULACION', 'DONACION');
ALTER TABLE "Movement" ALTER COLUMN "type" TYPE "MovementType_new" USING ("type"::text::"MovementType_new");
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";
DROP TYPE "public"."MovementType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "saleDetailId" TEXT,
ADD COLUMN     "transferId" TEXT,
ADD COLUMN     "unitCost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "isActive",
ADD COLUMN     "customerRut" TEXT,
ADD COLUMN     "documentType" "DocumentType" NOT NULL DEFAULT 'TICKET_INTERNO',
ADD COLUMN     "folio" INTEGER,
ADD COLUMN     "netAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "taxStatus" "TaxStatus" NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE "SaleDetail" ADD COLUMN     "returnedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDIENTE',
    "originId" TEXT NOT NULL,
    "destId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- CreateIndex
CREATE INDEX "Sale_folio_idx" ON "Sale"("folio");

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_destId_fkey" FOREIGN KEY ("destId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "TransferRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_saleDetailId_fkey" FOREIGN KEY ("saleDetailId") REFERENCES "SaleDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "TransferRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
