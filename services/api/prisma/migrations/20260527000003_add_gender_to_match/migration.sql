CREATE TYPE "MatchGender" AS ENUM ('MALE', 'FEMALE', 'MIXED');
ALTER TABLE "Match" ADD COLUMN "gender" "MatchGender";
CREATE INDEX "Match_gender_idx" ON "Match"("gender");
