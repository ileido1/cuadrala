# Tasks: Sport-Configurable Format Parameters

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1300–1500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 3 PRs: Backend Foundation → Backend Integration → Mobile |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test | Runtime harness | Rollback boundary |
|------|------|-----------|---|---|---|
| 1 | Backend foundation (Prisma + types + repo + validator) | PR #1 (main) | `npm test -- s32_01_tournament_format_parameters_validator` | Validator unit tests pass; schema round-trip Prisma | Drop column, revert repository methods |
| 2 | Backend integration (use case + seed v2 presets) | PR #2 (main) | `npm test -- e8_01_format_preset_versioning` | POST /tournaments with Tennis v2 format field | Revert seed, turn off new preset version |
| 3 | Mobile (DTO + widgets + screen refactor) | PR #3 (main) | `flutter test test/.../create_tournament_screen_test.dart` | Create tournament flow; schema renders as generic form | Revert screen/DTO/widget to hardcoded logic |

---

## Phase 1: Backend Foundation — Prisma & Types

- [x] 1.1 Create Prisma migration: add `parametersSchema: Json?` nullable column to `TournamentFormatPreset`
- [x] 1.2 Define `FormatParameterFieldSchema` union type in `services/api/src/domain/ports/tournament_format_parameters_validator.ts` (boolean/int/enum variants)
- [x] 1.3 Update `FormatPresetRepository` interface to include `parametersSchema` in DTO type
- [x] 1.4 Update `PrismaFormatPresetRepository.listActiveFormatPresetsBySportIdSV()` to select `parametersSchema`
- [x] 1.5 Update `PrismaFormatPresetRepository.findByIdSV()` to select `parametersSchema`
- [x] 1.6 Update `PrismaFormatPresetRepository.findActiveBySportAndCodeSV()` to select `parametersSchema`
- [x] 1.7 Update `PrismaFormatPresetRepository.publishNewVersionSV()` to accept and persist `parametersSchema` parameter

## Phase 2: Backend Validator — Core Logic

- [x] 2.1 Rewrite `DefaultTournamentFormatParametersValidator.validateAndNormalizeSV()` to accept `parametersSchema` in input (not `presetCode`)
- [x] 2.2 Implement generic schema iteration: for each field in `parametersSchema`, validate by type (boolean/int/enum)
- [x] 2.3 Add boolean field validation: reject if not `boolean`, accept any truthy/falsy value
- [x] 2.4 Add int field validation: reject if not integer, enforce min/max bounds if declared
- [x] 2.5 Add enum field validation: reject if not in `options[].value` list
- [x] 2.6 Add required field check: reject if `required: true` and field missing from `formatParameters`
- [x] 2.7 Add extra-keys check: reject any key in `formatParameters` not in schema
- [x] 2.8 Update validator port type to require `parametersSchema`, drop `presetCode`

## Phase 3: Backend Integration — Use Cases & Seed

- [x] 3.1 Update `CreateParametrizedTournamentUseCase.executeSV()` to resolve `parametersSchema` from fetched preset before validating
- [x] 3.2 Pass `{ parametersSchema, formatParameters }` to validator instead of `{ presetCode, presetSchemaVersion, formatParameters }`
- [x] 3.3 Remove early MVP validation (`presetCode` + hardcoded `schemaVersion: 1` check)
- [x] 3.4 Update `services/api/prisma/seed.ts`: declare `parametersSchema` for base presets (AMERICANO, ROUND_ROBIN, SINGLE_ELIMINATION)
- [x] 3.5 Seed Tennis v2 preset with `format` field (enum SINGLES/DOUBLES, required: true)
- [x] 3.6 Verify seed publishes v2 as new version; v1 remains unchanged

## Phase 4: Mobile Foundation — DTO & Widgets

- [ ] 4.1 Add `parametersSchema: List<FormatParameterFieldDef>?` field to `TournamentPresetDto` (nullable, default [])
- [ ] 4.2 Update `TournamentPresetDto.fromJson()` to parse `parametersSchema` from API response
- [ ] 4.3 Update `TournamentPresetDto.toJson()` to include `parametersSchema`
- [ ] 4.4 Create `FormatParameterFieldDef` base class and subclasses (`BooleanFieldDef`, `IntFieldDef`, `EnumFieldDef`) in a shared types file
- [ ] 4.5 Promote `_StepperTiny` widget from private in `create_tournament_screen.dart` to public in `apps/mobile/lib/src/shared/widgets/stepper_tiny.dart`
- [ ] 4.6 Create `DynamicFormatParametersForm` widget in `apps/mobile/lib/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart`
- [ ] 4.7 Implement rendering logic in `DynamicFormatParametersForm`: boolean → `SwitchListTile`, int → `StepperTiny`, enum → `SegmentedControl<String>`
- [ ] 4.8 Implement `onChanged(fieldKey, newValue)` callback in `DynamicFormatParametersForm`
- [ ] 4.9 Implement required-field indicator (red asterisk or bold) in field label

## Phase 5: Mobile Integration — Screen & State

- [ ] 5.1 Remove `_isTenis` computed property from `_CreateTournamentScreenState`
- [ ] 5.2 Remove `_tennisFormat` field; replace with generic `Map<String, Object?> _formatParameterValues`
- [ ] 5.3 Remove per-field variables (`_doubleRound`, `_americanoRounds`, `_americanoCourts`, `_thirdPlaceMatch`)
- [ ] 5.4 Remove `_PresetParametersCard` switch statement
- [ ] 5.5 On preset selection, initialize `_formatParameterValues` from preset's `defaultParameters`
- [ ] 5.6 In `_buildCreateRequest()`, validate all fields marked `required: true` in schema before allowing submit
- [ ] 5.7 Update `_canSubmit` getter to check schema-required fields instead of hardcoded `_isTenis && _tennisFormat`
- [ ] 5.8 Render `DynamicFormatParametersForm` widget in build tree with current `_formatParameterValues` and `onChanged` callback
- [ ] 5.9 Update `CreateTournamentRequest` body builder to pass `_formatParameterValues` directly as `formatParameters`
- [ ] 5.10 Minimal updates to `CreateTournamentCubit` (if any): it already receives generic `formatParameters` map

## Phase 6: Testing & Verification

- [ ] 6.1 Update `s32_01_tournament_format_parameters_validator.domain.test.ts`: remove all preset-code fixtures
- [ ] 6.2 Add unit test: boolean field accepted when `type: 'boolean'`, rejected when not boolean
- [ ] 6.3 Add unit test: int field with min/max bounds enforced; rejected if out of range
- [ ] 6.4 Add unit test: enum field rejected if value not in `options[].value` list
- [ ] 6.5 Add unit test: required field rejected if missing from `formatParameters`
- [ ] 6.6 Add unit test: extra keys in `formatParameters` rejected
- [ ] 6.7 Add unit test: empty `formatParameters` accepted when no required fields
- [ ] 6.8 Update integration test `e8_01_format_preset_versioning.http-db.integration.test.ts`: verify Tennis v1 has no format schema, Tennis v2 has format required
- [ ] 6.9 Add E2E test: POST /tournaments with Tennis v2 without format field → 400 VALIDACION_FALLIDA
- [ ] 6.10 Add E2E test: POST /tournaments with Tennis v2 with valid format field → 201 success
- [ ] 6.11 Add E2E test: POST /tournaments with Pádel (no format field) → 201 success (no format required)
- [ ] 6.12 Widget test: `create_tournament_screen` with Tennis v2 → `DynamicFormatParametersForm` renders enum field with SINGLES/DOUBLES
- [ ] 6.13 Widget test: `create_tournament_screen` with Pádel → no extra selector shown (schema empty)
