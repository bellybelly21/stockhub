/*
  Warnings:

  - Added the required column `absoluteExpiresAt` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "replacedByToken" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
