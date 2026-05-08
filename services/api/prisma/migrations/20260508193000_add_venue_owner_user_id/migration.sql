-- E8: add ownerUserId to Venue (nullable FK → User, unique, onDelete SetNull)
ALTER TABLE "Venue" ADD COLUMN "ownerUserId" TEXT;

ALTER TABLE "Venue"
ADD CONSTRAINT "Venue_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Venue_ownerUserId_key" ON "Venue"("ownerUserId");
