ALTER TABLE "MatchResultScore"
  ADD COLUMN "tournamentRegistrationId" TEXT;

ALTER TABLE "MatchResultScore"
  ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX "MatchResultScore_tournamentRegistrationId_idx"
  ON "MatchResultScore"("tournamentRegistrationId");

CREATE UNIQUE INDEX "MatchResultScore_resultId_tournamentRegistrationId_key"
  ON "MatchResultScore"("resultId", "tournamentRegistrationId");

ALTER TABLE "MatchResultScore"
  ADD CONSTRAINT "MatchResultScore_tournamentRegistrationId_fkey"
  FOREIGN KEY ("tournamentRegistrationId") REFERENCES "TournamentRegistration"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historical rows are linked to the registration that was materialized in the match.
UPDATE "MatchResultScore" AS score
SET "tournamentRegistrationId" = participant."tournamentRegistrationId"
FROM "MatchResult" AS result, "MatchParticipant" AS participant
WHERE score."resultId" = result."id"
  AND participant."matchId" = result."matchId"
  AND participant."userId" = score."userId"
  AND score."tournamentRegistrationId" IS NULL;
