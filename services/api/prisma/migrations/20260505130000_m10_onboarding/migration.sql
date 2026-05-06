-- M10 Onboarding rico: PlayerSportProfile, UserAvailability, UserLocation + extensión PlayerProfile

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "AvailabilitySlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- AlterTable: extender PlayerProfile con phone, avatarUrl, city, onboardingCompletedAt
ALTER TABLE "PlayerProfile"
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "avatarUrl" TEXT,
    ADD COLUMN "city" TEXT,
    ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- CreateTable: PlayerSportProfile (perfil técnico por deporte)
CREATE TABLE "PlayerSportProfile" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "skillLevel" DECIMAL(3,1) NOT NULL,
    "sidePreference" "SidePreference" NOT NULL DEFAULT 'ANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSportProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerSportProfile_sportId_idx" ON "PlayerSportProfile"("sportId");
CREATE UNIQUE INDEX "PlayerSportProfile_playerProfileId_sportId_key" ON "PlayerSportProfile"("playerProfileId", "sportId");

ALTER TABLE "PlayerSportProfile" ADD CONSTRAINT "PlayerSportProfile_playerProfileId_fkey"
    FOREIGN KEY ("playerProfileId") REFERENCES "PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerSportProfile" ADD CONSTRAINT "PlayerSportProfile_sportId_fkey"
    FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserAvailability (multi-fila por día/franja)
CREATE TABLE "UserAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "slot" "AvailabilitySlot" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAvailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAvailability_userId_idx" ON "UserAvailability"("userId");
CREATE UNIQUE INDEX "UserAvailability_userId_dayOfWeek_slot_key" ON "UserAvailability"("userId", "dayOfWeek", "slot");

ALTER TABLE "UserAvailability" ADD CONSTRAINT "UserAvailability_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UserLocation (ubicación de referencia y radio)
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "radiusKm" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserLocation_userId_key" ON "UserLocation"("userId");
CREATE INDEX "UserLocation_userId_idx" ON "UserLocation"("userId");

ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
