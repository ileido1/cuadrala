-- Backfill parametersSchema for base presets created before the column existed.
-- 20260909000000 added the column as NULL and the seed skips existing v1 rows, so
-- those presets reject every formatParameters key. Values mirror
-- src/domain/services/tournament/format_preset_parameters_catalog.ts.
-- Only schemaVersion = 1 rows still NULL are touched: presets that already
-- declare a schema (for example Tennis ROUND_ROBIN v2) stay as they are.
UPDATE "TournamentFormatPreset"
SET "parametersSchema" = '[{"key":"rounds","type":"int","label":"Rondas","required":false,"min":1,"max":50},{"key":"courts","type":"int","label":"Canchas","required":false,"min":1,"max":10}]'::jsonb
WHERE "code" = 'AMERICANO' AND "schemaVersion" = 1 AND "parametersSchema" IS NULL;

UPDATE "TournamentFormatPreset"
SET "parametersSchema" = '[{"key":"doubleRound","type":"boolean","label":"Doble vuelta","required":false}]'::jsonb
WHERE "code" = 'ROUND_ROBIN' AND "schemaVersion" = 1 AND "parametersSchema" IS NULL;

UPDATE "TournamentFormatPreset"
SET "parametersSchema" = '[{"key":"thirdPlaceMatch","type":"boolean","label":"Tercer lugar","required":false}]'::jsonb
WHERE "code" = 'SINGLE_ELIMINATION' AND "schemaVersion" = 1 AND "parametersSchema" IS NULL;
