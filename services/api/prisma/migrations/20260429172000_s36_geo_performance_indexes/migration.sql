-- Sprint 36: performance geo (índices/queries/limits) - índices no destructivos

-- Match: acelerar filtros típicos por status/fecha y joins por court/venue
CREATE INDEX IF NOT EXISTS "Match_status_scheduledAt_idx" ON "Match"("status","scheduledAt");
CREATE INDEX IF NOT EXISTS "Match_courtId_status_scheduledAt_idx" ON "Match"("courtId","status","scheduledAt");
CREATE INDEX IF NOT EXISTS "Match_sportId_categoryId_status_scheduledAt_idx"
  ON "Match"("sportId","categoryId","status","scheduledAt");

-- Court: acelerar join por venue
CREATE INDEX IF NOT EXISTS "Court_venueId_idx" ON "Court"("venueId");

