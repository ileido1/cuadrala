-- CreateEnum
CREATE TYPE "VenueStaffRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('PADEL', 'TENNIS');

-- DropIndex
DROP INDEX "Court_venueId_idx";

-- DropIndex
DROP INDEX "Match_courtId_status_scheduledAt_idx";

-- DropIndex
DROP INDEX "Match_sportId_categoryId_status_scheduledAt_idx";

-- DropIndex
DROP INDEX "Match_status_scheduledAt_idx";

-- DropIndex
DROP INDEX "MatchResultConfirmation_draftId_idx";

-- DropIndex
DROP INDEX "MatchResultDraft_matchId_idx";

-- DropIndex
DROP INDEX "TournamentAmericanoSchedule_tournamentId_idx";

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "indoor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lighting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sportType" "SportType" NOT NULL DEFAULT 'PADEL',
ADD COLUMN     "status" "CourtStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "surfaceType" TEXT;

-- AlterTable
ALTER TABLE "DevicePushToken" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MatchResultDraft" ALTER COLUMN "version" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationDelivery" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NotificationSubscription" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TournamentAmericanoSchedule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VacantHour" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "paymentAlias" TEXT,
ADD COLUMN     "paymentBank" TEXT,
ADD COLUMN     "paymentCvu" TEXT,
ADD COLUMN     "paymentHolder" TEXT,
ADD COLUMN     "paymentNotes" TEXT;

-- CreateTable
CREATE TABLE "VenueStaff" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VenueStaffRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenueStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VenueStaff_userId_idx" ON "VenueStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueStaff_venueId_userId_key" ON "VenueStaff"("venueId", "userId");

-- AddForeignKey
ALTER TABLE "VenueStaff" ADD CONSTRAINT "VenueStaff_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueStaff" ADD CONSTRAINT "VenueStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "DevicePushToken_user_enabled_idx" RENAME TO "DevicePushToken_userId_enabled_idx";

-- RenameIndex
ALTER INDEX "NotificationSubscription_near_idx" RENAME TO "NotificationSubscription_nearLat_nearLng_idx";

-- RenameIndex
ALTER INDEX "TournamentFormatPreset_sportId_code_isActive_effectiveFrom_vers" RENAME TO "TournamentFormatPreset_sportId_code_isActive_effectiveFrom__idx";
