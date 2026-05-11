-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "capacity" TEXT,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "pricePerHourCents" INTEGER;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "phone" TEXT;
