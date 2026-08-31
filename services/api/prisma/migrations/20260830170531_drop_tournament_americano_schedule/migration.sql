/*
  Warnings:

  - You are about to drop the `TournamentAmericanoSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TournamentAmericanoSchedule" DROP CONSTRAINT "TournamentAmericanoSchedule_tournamentId_fkey";

-- DropTable
DROP TABLE "TournamentAmericanoSchedule";
