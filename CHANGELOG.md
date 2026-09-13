# Changelog

## [Unreleased]

### Security
- **Tournaments handoff fidelity (S4)**: `GET /tournaments/:id/registrations` no longer exposes a guest's `guestPhone`/`guestEmail` to any authenticated caller; only the tournament's organizer or venue staff receive them, everyone else gets `null` while `status` and `guestName` stay intact (`services/api` 1.7.1)

### Added
- **Tournaments handoff fidelity (S7a)**: new pure domain function `resolveSingleEliminationProgressSV` computes single-elimination bracket advancement (next-round pairing from recorded winners, first-round bye auto-advancement, third-place match fed by semifinal losers) with side-opaque `winnerRef`/`loserRef` so a doubles side is never mistaken for a single userId; not yet wired into any use case or endpoint (`services/api` 1.9.1)
- **Tournaments handoff fidelity (S6b)**: `GET /tournaments/:tournamentId/schedule` now returns `matchId`, `matchStatus`, `decision`, `rejectedByName`, `sides` (grouped by `MatchParticipant.teamLabel ?? userId`) and `scores` per match, resolved from the materialized `Match` rows via `formatParameters.{scheduleKey,roundNumber,matchNumber}` with one query per schedule (`services/api` 1.9.0)
- **Tournaments handoff fidelity (S5)**: `GET /tournaments/:tournamentId/schedule/my-matches` now returns `roundName` (qualitative round name for single-elimination tournaments, `null` for other formats), reusing the round-naming logic exported from `bracket_generator.ts`; `GET /tournaments/:tournamentId/scoreboard` now returns `gamesWon` per row, aggregated by side (`MatchParticipant.teamLabel` for doubles) rather than by individual score row (`services/api` 1.8.0)
- **Tournaments handoff fidelity (S3b-1)**: new `GET /api/v1/users/me/tournaments` returns the viewer's tournaments across registration, invitation and organizer roles — `registrationStatus`, `pendingInvitationId`, `isOrganizer`, and `pendingRegistrationsCount` (organizer-only); requires authentication (`services/api` 1.7.0)
- **Tournaments handoff fidelity (S3a)**: `GET /tournaments` and `GET /tournaments/:id` now return `organizerName` (organizer's display name, `null` when unassigned); `GET /tournaments/:id/invitations` now returns `invitedUserName` for each invitation, resolved via join with no schema change (`services/api` 1.6.0)
- **Tournaments handoff fidelity (S2)**: `Tournament.gender` is now an optional nullable field (reuses `MatchGender`); `POST /tournaments` accepts it, existing rows and legacy clients stay `null`, and it is returned on both the tournament detail and listing (`services/api` 1.5.0)
- **Tournaments handoff fidelity (S1)**: `GET /tournaments` now accepts `near`/`radiusKm` and returns `distanceKm` per item, filtering by the tournament's venue location (`services/api` 1.4.0)
- **Sport-Configurable Format Parameters (SDD Change A)**
  - Backend: Generic tournament format parameter schema system (boolean/int/enum fields)
  - Database: Added `parametersSchema` column to `TournamentFormatPreset` for storing field definitions
  - API: `/sports/:id/tournament-format-presets` now returns `parametersSchema` for dynamic UI rendering
  - Backend validator: Replaced hardcoded preset-specific logic with generic schema-driven validation
  - Mobile: New `DynamicFormatParametersForm` widget for rendering parameters by field type
  - Mobile: New `FormatParameterFieldDef` types (BooleanFieldDef, IntFieldDef, EnumFieldDef)
  - Tennis v2 preset: Added `format` field (SINGLES/DOUBLES, required) via database seed
  - Backward compatibility: Tennis v1 remains unchanged; only new tournaments against v2 require format field

### Changed
- CI: `deploy-mobile.yml` uses `actions/checkout@v7` (Node 24) instead of `v4`, whose Node 20 runtime is deprecated on GitHub runners
- `CreateParametrizedTournamentUseCase`: Removed early MVP validation; now validates against preset's schema directly
- `create_tournament_screen.dart`: Replaced hardcoded `_isTenis`, `_tennisFormat`, `_doubleRound`, `_americanoRounds` with generic `_formatParameterValues` map
- `TournamentPresetDto`: Added `parametersSchema` field for consuming schema from API
- Prisma migration: Added `parametersSchema` column to `TournamentFormatPreset` model

### Fixed
- **Tournaments handoff fidelity (S6a)**: `POST /tournaments/:tournamentId/matches/:matchId/results` now accepts the tournament's organizer (not just venue staff), and fixes a pre-existing bug where the route's two path params (`tournamentId`+`matchId`) always failed strict Zod validation, so the route never worked via HTTP for anyone (`services/api` 1.8.1)
- **Tournaments handoff fidelity (S6a, duplicate result)**: the same endpoint now rejects a second result for an already-resolved match with 409 `RESULTADO_YA_CARGADO`, writing nothing (`services/api` 1.8.1)
- **Tournaments handoff fidelity (S6a2)**: the duplicate-result check is now race-safe under real concurrency (`Match` row lock + in-transaction re-check), verified by a test firing two strictly simultaneous requests (`services/api` 1.8.2)
- API 1.3.1: v1 format presets (`AMERICANO`, `ROUND_ROBIN`, `SINGLE_ELIMINATION`) created before the `parametersSchema` column accept their `formatParameters` again; migration `20260911120000_backfill_v1_preset_parameters_schema` fills the missing schema
- Tournament creation no longer hardcoded to specific sports (Tenis singles/doubles selector)
- Parameter validation now driven by database configuration, not client code

## Development

### Testing
- Added 15 unit tests for generic format parameter validator (boolean, int, enum field validation)
- Validator tests: 15/15 passing (all field types, bounds checking, enum options, required fields)
- Backend typecheck: all errors resolved
- Prisma migration applied successfully
- Seed successfully created presets with schemas and Tennis v2 preset

### Architecture
- Specs: 3 delta specs created (dynamic-format-parameters, tournament-format-presets-catalog, tournament-creation)
- Design: Documented architecture decisions, data flow, file changes, testing strategy
- Tasks: 53 tasks broken down into 6 phases across backend and mobile
- Chain strategy: Stacked PRs to main (PR #1: Backend, PR #2: Mobile, PR #3+: Testing/Archive)

---

**Work in progress**: Mobile integration (Phases 4–5) in flight; backend (Phases 1–3) complete and verified.
