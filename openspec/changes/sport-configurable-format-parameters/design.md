# Design: Sport-Configurable Format Parameters

## Technical Approach

Replace hardcoded tournament format parameter logic (indexed by preset code) with a database-driven schema that defines what parameters each preset accepts. Backend declares the shape; frontend renders generically by field type. Existing tournaments unaffected via preset versioning (v1 unchanged, v2 adds new fields).

**Key strategy:**
- Separate **parameter definition** (schema) from **parameter values** (defaultParameters)
- Add `parametersSchema: Json?` column to `TournamentFormatPreset`
- Move validator from switch-on-presetCode to iteration over schema definition
- Generic mobile widget renders boolean→switch, int→stepper, enum→segmented control
- Tennis v2 declares `format: enum(SINGLES, DOUBLES)` as required; v1 keeps working without it

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Schema storage** | `parametersSchema: Json?` in Prisma, separate from `defaultParameters` | Cleanly separates shape (immutable per preset version) from values (mutable per tournament); easier to reason about. Alternative: embed in defaultParameters — confusing; add dedicated table — over-engineered. |
| **Validator approach** | Iterate schema, validate by field type (not presetCode switch) | Generic across all future presets; enables new sports without code changes. Scales to N presets. |
| **Backward compat** | v1 presets have no schema (empty or null); v2 publishes as new version | Tournaments pointing to v1 never ask for new fields; seeder publishes v2 alongside v1; clients pick latest or explicit version. |
| **Mobile schema rendering** | `DynamicFormatParametersForm` widget; no preset-specific logic | Single component; reusable; future formats need no mobile code changes. |
| **Schema type definition** | Union type (boolean/int/enum) in TypeScript; no JSON-schema (simple types only) | Project has no JSON-schema validator; union type is sufficient and type-safe. Enum options stored as structured objects (value + label). |
| **Validator input** | Accept `parametersSchema` from preset, not presetCode | Decouples validator from repository; easier to test; enables publishing v2 that shares a different validator if needed. |

## Data Flow

**Creation flow:**
```
Client POST /tournaments
  ├─ Body: { formatParameters: { format: "SINGLES", ... } }
  ├─ API resolves formatPresetId → fetch Preset with parametersSchema
  ├─ Validator.validateAndNormalizeSV( { parametersSchema, formatParameters } )
  │  └─ Iterate schema, type-check, bounds-check, enum-options-check
  │  └─ Reject if required field missing, type invalid, or value out of bounds
  └─ Save tournament.formatParameters as-is if valid
```

**Read flow:**
```
Client GET /sports/:sportId/tournament-format-presets
  └─ API returns [{ id, code, version, defaultParameters, parametersSchema: [...] }]
     └─ Client receives schema, initializes form from defaultParameters, renders by type
```

**Validation layer progression:**
1. **Format validation (FVAL):** types, required presence — no DB
2. **Data validation (DVAL):** business rules, schema matching — uses Preset resolved from DB
3. **Validator (domain service):** generic schema-based validation — type-checks and bounds

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `services/api/prisma/schema.prisma` | Modify | Add `parametersSchema: Json?` column to `TournamentFormatPreset`; create migration |
| `services/api/src/domain/ports/format_preset_repository.ts` | Modify | Add `FormatParameterFieldSchema` types; include `parametersSchema` in DTO |
| `services/api/src/infrastructure/adapters/prisma_format_preset_repository.ts` | Modify | Select and return `parametersSchema` in all three methods |
| `services/api/src/domain/services/tournament/tournament_format_parameters_validator.ts` | Modify | Replace switch-on-presetCode with generic iteration over `parametersSchema`; handle boolean/int/enum |
| `services/api/src/application/use_cases/create_parametrized_tournament.use_case.ts` | Modify | Resolve `parametersSchema` before validating; pass schema to validator |
| `services/api/prisma/seed.ts` | Modify | Declare `parametersSchema` per base preset (AMERICANO, ROUND_ROBIN, SINGLE_ELIMINATION); add format field for Tennis v2 via `publishNewVersionSV` |
| `services/api/src/test/unit/s32_01_tournament_format_parameters_validator.domain.test.ts` | Modify | Update tests to pass `parametersSchema` directly; remove preset-code fixtures |
| `apps/mobile/lib/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart` | Create | Generic widget: renders schema by field type (boolean→switch, int→stepper, enum→segmented); emits `onChanged` callback |
| `apps/mobile/lib/src/shared/widgets/stepper_tiny.dart` | Create | Promote `_StepperTiny` from private to public reusable widget |
| `apps/mobile/lib/src/features/tournaments/data/models/tournament_preset_dto.dart` | Modify | Add `parametersSchema: List<FormatParameterFieldDef>?` field (nullable, default []) |
| `apps/mobile/lib/src/features/tournaments/presentation/create_tournament_screen.dart` | Modify | Replace `_isTenis`, `_tennisFormat`, `_PresetParametersCard` switch, and per-field vars with generic `_formatParameterValues` map; use `DynamicFormatParametersForm`; validate required fields from schema |

## Interfaces / Contracts

**Backend type definition (TypeScript):**
```typescript
type FormatParameterFieldSchema =
  | { key: string; type: 'boolean'; label: string; required?: boolean }
  | { key: string; type: 'int'; label: string; required?: boolean; min?: number; max?: number }
  | { key: string; type: 'enum'; label: string; required?: boolean; options: Array<{ value: string; label: string }> };

interface TournamentFormatParametersValidator {
  validateAndNormalizeSV(_input: {
    parametersSchema: FormatParameterFieldSchema[];
    formatParameters?: unknown;
  }): unknown | undefined;
}
```

**Mobile Dart widget:**
```dart
class DynamicFormatParametersForm extends StatelessWidget {
  final List<FormatParameterFieldDef> fields;
  final Map<String, Object?> values;
  final void Function(String key, Object? value) onChanged;
}
```

**API response example:**
```json
{
  "presets": [
    {
      "id": "tennis-v2",
      "code": "ROUND_ROBIN",
      "version": 2,
      "defaultParameters": { "doubleRound": false },
      "parametersSchema": [
        { "key": "doubleRound", "type": "boolean", "label": "Doble vuelta", "required": false },
        { "key": "format", "type": "enum", "label": "Categoría de juego", "required": true, 
          "options": [{ "value": "SINGLES", "label": "Singles" }, { "value": "DOUBLES", "label": "Dobles" }] }
      ]
    }
  ]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Generic validator logic (boolean/int/enum type-checking, bounds, required) | Direct instantiation of `DefaultTournamentFormatParametersValidator` with mock schemas; no DB. Covers all 3 types + edge cases. |
| Integration | Preset versioning (v1 without format, v2 with format) | Create 2 presets, query each, verify v1 has no format field in schema, v2 has it. Tournament created against v1 never requires format. |
| E2E | End-to-end: client initializes form from preset, submits parameters, validates server-side | Create Tennis tournament: GET presets (receive schema), POST with format field, verify 400 if format missing on v2, verify success if present. No format field on Pádel. |

## Threat Matrix

N/A — no routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

1. **Prisma migration:** Add `parametersSchema` column to `TournamentFormatPreset`. Deployment required before seeding new v2 presets.
2. **Seed new presets:** Base presets (AMERICANO, ROUND_ROBIN, SINGLE_ELIMINATION) declare `parametersSchema` in v1. Tennis v2 published as new version with format field.
3. **API deployment:** Expose `parametersSchema` in response; validator accepts schema-driven input.
4. **Mobile deployment:** Consume schema; render generic form.
5. **No existing tournament affected:** v1 presets remain unchanged; pointing tournaments still work.

## Open Questions

- [ ] Should admin UI allow editing `parametersSchema`, or is seed/database-only acceptable for now?
- [ ] If a new sport needs custom enum values (e.g., court types), is in-database schema storage sufficient, or do we need a UI tool?
