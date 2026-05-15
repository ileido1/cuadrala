/*
  Warnings:

  - A unique constraint covering the columns `[documentNumber]` on the table `PlayerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PlayerProfile" ADD COLUMN     "documentNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_documentNumber_key" ON "PlayerProfile"("documentNumber");
