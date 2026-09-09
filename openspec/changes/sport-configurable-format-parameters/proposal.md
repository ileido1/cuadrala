# Proposal: Sport-Configurable Format Parameters

## Intent

Mobile client hardcodes `if (sport.name.contains('tenis')) show Singles/Dobles selector` in `create_tournament_screen.dart`. This couples the app to specific sports and requires mobile redeploy to add new sport-specific parameters (e.g., court type variants, skill modifiers). The change moves parameter declarations to database — backend declares what fields each sport/preset pair supports; mobile paints a generic form component. This enables adding sport-specific gameplay variants (Singles/Doubles for Tennis, court typologies for new sports) via configuration without touching client code.

## Scope

### In Scope
- Add `parametersSchema: Json?` column to `TournamentFormatPreset` (Prisma migration)
- Define `FormatParameterFieldSchema` type (boolean/int/enum fields with label, required, min/max, options)
- Rewrite `DefaultTournamentFormatParametersValidator` to validate generically by `parametersSchema` instead of hardcoded switch on `presetCode`
- Expose `parametersSchema` in API response `GET /sports/:id/tournament-format-presets`
- Add `format` field (enum SINGLES/DOUBLES, required) to Tennis presets v2 via new seed records
- Create `DynamicFormatParametersForm` widget (Flutter) to render fields by type (boolean→switch, int→stepper, enum→segmented control)
- Promote `_StepperTiny` widget from private to `shared/widgets/stepper_tiny.dart`
- Rewrite `create_tournament_screen.dart` to consume generic schema instead of hardcoded tenis logic
- Remove `_isTenis`, `_tennisFormat`, `_PresetParametersCard`, and per-field variables (`_doubleRound`, `_americanoRounds`, etc.)

### Out of Scope
- Multi-category tournaments (separate Change B, sequenced after this one)
- Eligibility validation by player's declared category (gap already exists, addressed separately)
- Admin UI to edit `parametersSchema` (manual via seed or database for now)

## Capabilities

### New Capabilities
- `dynamic-format-parameters`: Generic form component that renders tournament preset parameters by type (boolean/int/enum) based on schema from backend.

### Modified Capabilities
- `tournament-format-presets-catalog`: Extend response to include `parametersSchema` (was: only `defaultParameters`).
- `tournament-creation`: No longer hardcoded per sport; parameter fields driven by preset schema.

## Approach

1. **Backend**: Add `parametersSchema` to `TournamentFormatPreset`, validate fields generically (not by preset code). Tennis v2 declares `format: enum(SINGLES, DOUBLES)` as required. Seed publishes v2 if v1 exists.
2. **Mobile**: New `DynamicFormatParametersForm` widget (generified from `_PresetParametersCard`). Consumed in `create_tournament_screen.dart` via `Map<String, Object?> _formatParameterValues`, initialized from preset defaults.
3. **Backward compat**: Tournaments created against Tenis v1 (no `format` required) stay valid. Only new torneys vs. v2 enforce the field.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `services/api/prisma/schema.prisma` | Modified | Add `parametersSchema Json?` to `TournamentFormatPreset` |
| `services/api/src/domain/services/tournament/tournament_format_parameters_validator.ts` | Modified | Replace switch by `presetCode` with generic validation by `parametersSchema` |
| `services/api/src/infrastructure/adapters/prisma_format_preset_repository.ts` | Modified | Include `parametersSchema` in select and create |
| `services/api/src/application/use_cases/create_parametrized_tournament.use_case.ts` | Modified | Resolve schema before validating; remove duplicated early validation |
| `services/api/prisma/seed.ts` | Modified | Declare base schemas per preset, add `format` field only for Tennis v2 |
| `apps/mobile/lib/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart` | New | Generic form widget by field type |
| `apps/mobile/lib/src/shared/widgets/stepper_tiny.dart` | New | Promoted from private `_StepperTiny` |
| `apps/mobile/lib/src/features/tournaments/presentation/create_tournament_screen.dart` | Modified | Consume schema; remove hardcoded tenis/preset-code logic |
| `apps/mobile/lib/src/features/tournaments/data/models/tournament_preset_dto.dart` | Modified | Add `parametersSchema` field |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API changes breaking mobile clients not yet deployed | Medium | `parametersSchema` is nullable, default empty; clients interpret absence as no fields (backward compat) |
| Validator test suite expects hardcoded switch branches | Medium | Update test fixtures to pass `parametersSchema` directly; validator no longer depends on preset repository |
| Mixing `parametersSchema` concept in `defaultParameters` schema | Low | Separate columns; `defaultParameters` stays "values", `parametersSchema` is "shape" |

## Rollback Plan

1. Revert Prisma migration (drop `parametersSchema` column).
2. Restore validator to hardcoded switch on `presetCode`.
3. Redeploy API without schema exposure.
4. Redeploy mobile with old `create_tournament_screen.dart` logic.
5. Existing tournaments with old presets unaffected (v1 still available, no schema to validate).

## Dependencies

- Prisma migration tooling (already in use)
- No external dependencies added; uses existing widgets (SegmentedControl, SelectableChip, SwitchListTile)

## Success Criteria

- [ ] `GET /sports/:id/tournament-format-presets` returns `parametersSchema` for each preset
- [ ] Creating a Tennis tournament without `format` field fails with `VALIDACION_FALLIDA` when using v2 preset
- [ ] `create_tournament_screen.dart` no longer contains `_isTenis`, `_tennisFormat` or per-field hardcodeo
- [ ] All existing Tennis tournaments (v1 preset) continue to work without changes
- [ ] Widget test for `create_tournament_screen.dart` with Tenis shows Singles/Dobles selector rendered by generic component
- [ ] Pádel (no `format` field) shows no extra selector

## Proposal Questions

Before finalizing specs, confirm:

1. **Schema versioning**: When Tenis v2 (with `format`) is live, will the API always prefer the latest version or allow clients to opt-in to older versions? Currently the seeder publishes v2 as a new version; older tournaments still point to v1.
2. **Admin UX for parameters**: Should the admin UI (or seed only) control `parametersSchema`, or should there be an endpoint to edit it?
3. **Multi-sport scope**: Should `parametersSchema` values (e.g., enum options like SINGLES/DOUBLES) be sport-scoped, or global? Currently assuming sport-scoped (Tennis has SINGLES/DOUBLES; other sports might not).

---

**Next Step**: Ready for specs (`sdd-spec`) to define the shape of `FormatParameterFieldSchema`, validation rules, API contract, and widget behavior.
