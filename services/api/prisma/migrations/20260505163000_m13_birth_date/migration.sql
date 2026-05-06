-- M13: add birthDate to PlayerProfile (incremental).
ALTER TABLE "PlayerProfile"
ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);

-- Optional: you may want an index if filtering by birthDate in future.
