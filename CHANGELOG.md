# Changelog

## [Unreleased]

### Added
- **Tournaments handoff fidelity (M4b-2)**: tournament cards now render a gender tag ("Masculino"/"Femenino"/"Mixto") next to the category chip when the tournament declared one; `TournamentStatusPill` gains explicit `DRAFT`/`COMPLETED` branches (both gray, matching the handoff) instead of relying on the unknown-status fallback; "Mis torneos" now wires `pendingInvitationId`/`isOrganizer` (M4a) into `TournamentListItemTile`, so the M4b-1 invitation banner and organizer row actually render. Closes Phase 3 (mobile listing screen) of the tournaments handoff fidelity change (`apps/mobile` 1.7.3+26)
- **Tournaments handoff fidelity (M4b-1b)**: `TournamentListItemTile` gains an optional `isOrganizer` flag and renders the lime shield row "Organizás {torneo}" with a chevron when set; not yet wired into any screen (`apps/mobile` 1.7.2+25)
- **Tournaments handoff fidelity (M4b-1a)**: `TournamentListItemTile` gains an optional `pendingInvitationId` and renders the lime invitation banner "{org} te invitó" / "Ver invitación →" when set; `{org}` resolves to the venue name, falling back to the organizer's display name when there is no venue; not yet wired into any screen (`apps/mobile` 1.7.1+24)
- **Tournaments handoff fidelity (M4a-2)**: "Mis torneos" now lists the viewer's real registrations/invitations, showing each card's registration status ("Adentro" for CONFIRMED, "Pendiente" otherwise) instead of a hardcoded empty list (`apps/mobile` 1.7.0+23)
- **Tournaments handoff fidelity (M4a-1)**: new `ViewerTournamentDto` and `TournamentsRepository.listMyTournaments()` mapping `GET /api/v1/users/me/tournaments`, not yet wired into any screen (`apps/mobile` 1.6.1+22)
- **Tournaments handoff fidelity (M3d)**: the "Cerca" chip resolves the viewer's saved location (`OnboardingRepository.getLocation()`), falling back to GPS, and applies `near`/`radiusKm: 10` through the cubit's existing `applyFilters`; the chip stays inactive when neither location resolves. Tournament cards now show `distanceKm` next to the venue when the API returns it (`apps/mobile` 1.6.0+21)
- **Tournaments handoff fidelity (M3c-2)**: the "Mi categoría" chip now renders (only when the viewer has a primary category) with the handoff's verbatim copy, and toggling it applies/clears the category filter through the cubit's existing `applyFilters` (`apps/mobile` 1.5.0+20)
- **Tournaments handoff fidelity (M3c-1)**: `TournamentsListCubit` now defaults its category filter to the viewer's own primary-rating category on first load, exposing `hasOwnCategory` on the loaded state; a filter the user already touched is never overridden on a later refresh (`apps/mobile` 1.4.1+19)
- **Tournaments handoff fidelity (M1)**: new shared widgets `CountStepper` (−/+ numeric stepper, disabled at min/max) and `PillToggle` (pill-shaped boolean switch), plus a new `enabled` flag on `SegmentedOption` (disabled options render dimmed and ignore taps) (`apps/mobile` 1.3.0+15)

### Removed
- **Tournaments handoff fidelity (M3b)**: deleted the now-unused `TournamentFiltersBar` widget (`apps/mobile` 1.3.2+17)
- **Tournaments handoff fidelity (M3a)**: the "Más filtros" button is gone from the tournaments home screen (not in the handoff); the "Mi categoría" chip is a temporary no-op until M3c wires it to the viewer's own category (`apps/mobile` 1.3.1+16)

### Changed
- **Tournaments handoff fidelity (M2)**: migrated every Material `Icons.*` reference under the tournaments feature (~46 usages, 16 files) to the semantic `AppIcons` catalog, guarded by a new regression test asserting zero raw `Icons.*` matches (`apps/mobile` 1.4.0+18)
- **Tournaments handoff fidelity (M0)**: split the tournament detail screen's ~3,100-line implementation file into 7 files via Dart `part`/`part of` (move-only, no behavior change) (`apps/mobile` 1.2.1+14)

### Security
- **Tournaments handoff fidelity (S4)**: `GET /tournaments/:id/registrations` no longer exposes a guest's `guestPhone`/`guestEmail` to any authenticated caller; only the tournament's organizer or venue staff receive them, everyone else gets `null` while `status` and `guestName` stay intact (`services/api` 1.7.1)

### Added
- **Tournaments handoff fidelity (S7c-1b)**: `POST /tournaments/:tournamentId/matches/:matchId/results` now automatically advances single-elimination brackets — a clear winner (by summed side points, singles or doubles) creates or fills the next-round match, including the third-place match, in the same database transaction as the result write, via the new `registerResultAndAdvanceSV` port method (replaces `registerResultSV`); a tournament-row lock serializes concurrent advancement so two semifinals resolved at once never create two finals, and retries are idempotent (`services/api` 1.10.0)
- **Tournaments handoff fidelity (S7c-1a)**: new pure domain function `resolveSingleEliminationAdvancementParticipantsSV` expands a resolved bracket-advancement ref into its `MatchParticipant` rows, adding the fixed doubles partner when applicable; not yet wired into any use case (`services/api` 1.9.3)

### Added
- **Tournaments handoff fidelity (S9)**: `POST /tournaments/:tournamentId/matches/:matchId/results` now dispatches a `TOURNAMENT_MATCH_RESULT_RECORDED` notification (exact handoff copy "Resultado cargado") to every `userId` present in the recorded scores, across every format; a guest side never appears in scores (`MatchResultScore.userId` is required) so it's naturally skipped; dispatch happens after the result is saved and is non-blocking (`services/api` 1.13.0)
- **Tournaments handoff fidelity (S8b)**: `GET /tournaments/:tournamentId/bracket` now returns the real `winnerId`, `score`, `status` and `matchId` for each match once its `Match` row is materialized, instead of always `winnerId: null`; slots with no materialized match (including byes) stay in preview, unchanged (`services/api` 1.12.0)

### Changed
- **Tournaments handoff fidelity (S8a)**: `POST /tournaments/:tournamentId/schedule:generate` now excludes guest registrations (no `userId`) when building a `SINGLE_ELIMINATION` bracket, matching the handoff copy "Los huéspedes quedan fuera del cuadro."; round-robin and americano generation are unchanged and still include guests (`services/api` 1.11.0)

### Fixed
- **Tournaments handoff fidelity (S7c-2)**: `getVenueIdForTournamentSV` (the venue guard for `POST /tournaments/:tournamentId/matches/:matchId/results`) could resolve `null` when the tournament's only courtless matches were single-elimination auto-advancement next-round matches, turning a would-be duplicate-result 409 into an incorrect 400; the lookup now requires `courtId: { not: null }` (`services/api` 1.10.1)
- **Tournaments handoff fidelity (S7b)**: `POST /tournaments/:tournamentId/matches/:matchId/results` now rejects a tied result in single-elimination tournaments (400 `VALIDACION_FALLIDA`, writes nothing), determining winner/tie by summed side points (`MatchParticipant.teamLabel ?? userId`) via the existing `resolveMatchWinningUserIdsSV`, fixing a doubles bug where comparing individual score rows could pick the wrong side (`services/api` 1.9.2)

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
