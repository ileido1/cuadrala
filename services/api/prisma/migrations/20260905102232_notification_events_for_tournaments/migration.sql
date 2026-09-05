-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'TOURNAMENT_REGISTRATION_RECEIVED';
ALTER TYPE "NotificationEventType" ADD VALUE 'TOURNAMENT_REGISTRATION_CONFIRMED';
ALTER TYPE "NotificationEventType" ADD VALUE 'TOURNAMENT_SCHEDULE_PUBLISHED';
ALTER TYPE "NotificationEventType" ADD VALUE 'TOURNAMENT_STARTED';

-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "tournamentId" TEXT,
ALTER COLUMN "matchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "NotificationEvent_tournamentId_idx" ON "NotificationEvent"("tournamentId");

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El sujeto del evento es exactamente uno: un partido o un torneo.
-- Va como CHECK y no solo como comentario en el schema porque Prisma no
-- expresa esta invariante y el modelo anterior la garantizaba con NOT NULL.
ALTER TABLE "NotificationEvent"
  ADD CONSTRAINT "NotificationEvent_subject_exactly_one"
  CHECK (("matchId" IS NOT NULL)::int + ("tournamentId" IS NOT NULL)::int = 1);
