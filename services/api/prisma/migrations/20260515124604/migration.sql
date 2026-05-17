/*
  Warnings:

  - You are about to drop the column `reservationId` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the `MatchReservationLink` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VacantHour` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MatchReservationLink" DROP CONSTRAINT "MatchReservationLink_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchReservationLink" DROP CONSTRAINT "MatchReservationLink_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "VacantHour" DROP CONSTRAINT "VacantHour_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "VacantHour" DROP CONSTRAINT "VacantHour_courtId_fkey";

-- DropForeignKey
ALTER TABLE "VacantHour" DROP CONSTRAINT "VacantHour_matchId_fkey";

-- DropForeignKey
ALTER TABLE "VacantHour" DROP CONSTRAINT "VacantHour_sportId_fkey";

-- DropForeignKey
ALTER TABLE "VacantHour" DROP CONSTRAINT "VacantHour_venueId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "reservationId";

-- DropTable
DROP TABLE "MatchReservationLink";

-- DropTable
DROP TABLE "VacantHour";

-- DropEnum
DROP TYPE "VacantHourStatus";

-- CreateIndex
CREATE INDEX "Reservation_type_idx" ON "Reservation"("type");

-- CreateIndex
CREATE INDEX "Reservation_visibility_idx" ON "Reservation"("visibility");

-- CreateIndex
CREATE INDEX "Reservation_matchId_idx" ON "Reservation"("matchId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Reservation_matchId_unique" RENAME TO "Reservation_matchId_key";
