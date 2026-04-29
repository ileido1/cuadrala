-- Sprint 34: Chat MVP por match/torneo (idempotente)

CREATE TABLE IF NOT EXISTS "ChatThread" (
  "id" TEXT NOT NULL,
  "matchId" TEXT,
  "tournamentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- Unicidad por match/tournament (a lo sumo un thread por entidad)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatThread_matchId_key') THEN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_matchId_key" UNIQUE ("matchId");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatThread_tournamentId_key') THEN
    ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_tournamentId_key" UNIQUE ("tournamentId");
  END IF;
END $$;

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatThread_matchId_fkey') THEN
    ALTER TABLE "ChatThread"
      ADD CONSTRAINT "ChatThread_matchId_fkey"
      FOREIGN KEY ("matchId") REFERENCES "Match"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatThread_tournamentId_fkey') THEN
    ALTER TABLE "ChatThread"
      ADD CONSTRAINT "ChatThread_tournamentId_fkey"
      FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ChatThread_createdAt_idx" ON "ChatThread"("createdAt");

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_threadId_fkey') THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_threadId_fkey"
      FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_senderUserId_fkey') THEN
    ALTER TABLE "ChatMessage"
      ADD CONSTRAINT "ChatMessage_senderUserId_fkey"
      FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId","createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderUserId_createdAt_idx" ON "ChatMessage"("senderUserId","createdAt");

