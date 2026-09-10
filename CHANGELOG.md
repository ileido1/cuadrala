# Changelog

## [Unreleased]

### Added
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
