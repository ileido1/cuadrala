# Tournament Creation Specification

## Purpose

Redefine tournament creation to accept dynamic format parameters via generic schema instead of hardcoded per-preset logic, enabling sports-specific gameplay variants without UI changes.

## Requirements

### Requirement: Accept Generic Format Parameters

The `POST /tournaments` endpoint **MUST** accept a `formatParameters: Map<string, any>` object that is validated against the selected preset's `parametersSchema` (not against hardcoded validation by preset code).

#### Scenario: Tennis Tournament with Format Field

- GIVEN a request to create a Tennis ROUND_ROBIN v2 tournament
- WHEN the body includes `{"formatParameters": {"doubleRound": false, "format": "SINGLES"}}`
- THEN the tournament is created successfully
- AND `formatParameters` is persisted as-is

#### Scenario: Missing Required Parameter Fails

- GIVEN a Tennis v2 preset (which requires "format")
- WHEN the body omits `format` from `formatParameters`
- THEN the API returns 400 with error code `VALIDACION_FALLIDA`
- AND error detail: "El campo 'format' es obligatorio"

#### Scenario: Pádel Tournament (No Extra Parameters)

- GIVEN a Pádel ROUND_ROBIN v1 tournament
- WHEN the body includes only `{"formatParameters": {"doubleRound": true}}`
- THEN the tournament is created successfully
- AND no "format" field is expected or validated

### Requirement: Validate Parameters Against Schema

The backend **MUST** use the preset's `parametersSchema` to validate all fields in `formatParameters`:
- If `required: true` and field is missing → error
- If `type: "int"` and value violates min/max → error
- If `type: "enum"` and value not in options → error
- No extra fields allowed (strict schema matching)

#### Scenario: Invalid Int Parameter (Out of Bounds)

- GIVEN Americano preset with `rounds: {type: "int", min: 1, max: 50}`
- WHEN request includes `{"formatParameters": {"rounds": 100}}`
- THEN the API returns 400 with `VALIDACION_FALLIDA`

#### Scenario: Invalid Enum Value

- GIVEN Tennis v2 with `format: {type: "enum", options: [{value: "SINGLES"}, {value: "DOUBLES"}]}`
- WHEN request includes `{"formatParameters": {"format": "MIXED"}}`
- THEN the API returns 400 with `VALIDACION_FALLIDA`

### Requirement: Generic Validator (No Hardcoded Switch)

The validation logic **MUST** iterate the schema and validate dynamically, not via a switch on `presetCode`. The validator **MUST** handle boolean/int/enum generically.

#### Scenario: Validator Rejects Hardcoded Logic

- GIVEN the validator receives a preset with `parametersSchema` and `formatParameters`
- WHEN it validates
- THEN it uses the schema to validate, not a switch statement like `if (preset.code === 'ROUND_ROBIN') { validate doubleRound }`

### Requirement: Backward Compatibility — v1 Presets

Tournaments created against v1 presets (before `format` was added to Tennis) **MUST** remain valid and unaffected. The v1 preset's `parametersSchema` does not include "format", so the validator will not require it.

#### Scenario: Existing Tennis v1 Tournament Unaffected

- GIVEN a tournament created against Tennis v1 (no "format" declared)
- WHEN the tournament is queried or its details displayed
- THEN it still works; no "format" field is expected or enforced

### Requirement: Initialize Parameters from Defaults

The mobile client **MUST** initialize the form with `defaultParameters` from the selected preset, then allow overrides.

#### Scenario: Client Uses Preset Defaults

- GIVEN Tennis v2 preset with `defaultParameters: {doubleRound: false, format: "SINGLES"}`
- WHEN the client creates a form
- THEN DynamicFormatParametersForm displays these as initial values
- AND user can change them before submission

## Validation Rules

| Field Type | Rule | Error Code |
|------------|------|------------|
| required=true, missing | Reject | `VALIDACION_FALLIDA` |
| int, violates min/max | Reject | `VALIDACION_FALLIDA` |
| enum, not in options | Reject | `VALIDACION_FALLIDA` |
| unknown field (not in schema) | Reject | `VALIDACION_FALLIDA` |
| extra fields | Reject | `VALIDACION_FALLIDA` |
