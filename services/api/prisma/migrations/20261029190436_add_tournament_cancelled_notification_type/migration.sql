-- AlterEnum
ALTER TYPE "NotificationEventType" ADD VALUE 'TOURNAMENT_CANCELLED';

-- DropIndex
DROP INDEX "QuickMatchSearch_sportId_categoryId_status_targetDate_idx";

-- DropIndex
DROP INDEX "TournamentSlotResponse_tournamentRegistrationId_idx";

-- RenameIndex
ALTER INDEX "TournamentSlotResponse_tournamentId_roundNumber_matchNumber_key" RENAME TO "TournamentSlotResponse_user_key";

-- RenameIndex
ALTER INDEX "TournamentSlotResponse_tournamentId_roundNumber_matchNumber_tou" RENAME TO "TournamentSlotResponse_registration_key";
