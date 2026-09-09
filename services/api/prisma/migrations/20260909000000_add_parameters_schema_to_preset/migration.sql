-- Add parametersSchema column to TournamentFormatPreset
ALTER TABLE "TournamentFormatPreset" ADD COLUMN "parametersSchema" JSONB;

-- Create index on sportId, code, isActive for efficient preset lookups
-- (already exists as per schema but ensuring consistency)
