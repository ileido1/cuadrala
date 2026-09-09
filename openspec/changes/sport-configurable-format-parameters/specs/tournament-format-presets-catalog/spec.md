# Tournament Format Presets Catalog Specification

## Purpose

Extend the tournament format presets catalog API to include parameter schema declarations for each preset, enabling clients to render dynamic parameter forms without hardcoded sport logic.

## Requirements

### Requirement: Expose Parameter Schema in Presets Response

The endpoint `GET /sports/:sportId/tournament-format-presets` **MUST** return each preset with a `parametersSchema` field (nullable array of field definitions).

#### Scenario: Tennis v2 with Format Field

- GIVEN Tennis sport is queried at `GET /sports/tennis-id/tournament-format-presets`
- WHEN the preset version is v2 (latest)
- THEN the response includes a ROUND_ROBIN preset with `parametersSchema: [{key: "doubleRound", type: "boolean", label: "Doble vuelta", required: false}]`
- AND a Tennis v2 preset with `parametersSchema: [{key: "format", type: "enum", label: "Categoría de juego", required: true, options: [{value: "SINGLES", label: "Singles"}, {value: "DOUBLES", label: "Dobles"}]}]`

#### Scenario: Pádel (No Extra Parameters)

- GIVEN Pádel sport is queried
- WHEN the preset is ROUND_ROBIN v1
- THEN `parametersSchema` contains only the base fields (doubleRound boolean)
- AND no "format" field

#### Scenario: Backward Compatibility — v1 Presets

- GIVEN a tournament was created against Tennis v1 preset (before `format` field was added)
- WHEN `GET /sports/tennis-id/tournament-format-presets` is called
- THEN both v1 and v2 presets are available
- AND v1's `parametersSchema` does NOT include "format" (it's optional for v1)
- AND clients can query v1 explicitly if needed

### Requirement: Schema Structure

Each parameter field in `parametersSchema` **MUST** include:
- `key: string` — field identifier (snake_case)
- `type: 'boolean' | 'int' | 'enum'` — input type
- `label: string` — human-readable label for UI
- `required: boolean?` — whether field is mandatory (default false)
- Type-specific metadata:
  - `int`: `min?: number, max?: number`
  - `enum`: `options: [{value: string, label: string}]`

#### Scenario: Tennis v2 Format Field Schema

- GIVEN a format field in Tennis v2 preset
- THEN it has: `{key: "format", type: "enum", label: "Categoría de juego", required: true, options: [{value: "SINGLES", label: "Singles"}, {value: "DOUBLES", label: "Dobles"}]}`

### Requirement: Schema Validation Governance

The backend **MUST** ensure that `parametersSchema` declared in a preset exactly matches the validation rules in `DefaultTournamentFormatParametersValidator`. If a discrepancy is detected, the system **SHOULD** log a warning at seed/migration time.

#### Scenario: Consistent Schema and Validator

- GIVEN Tennis v2 declares `{key: "format", type: "enum", required: true, options: [...]}`
- WHEN a tournament is created with formatPresetId pointing to Tennis v2
- THEN the validator enforces that "format" is present and matches one of the enum options
- AND the client's DynamicFormatParametersForm prevents submission if "format" is missing

## API Response Example

```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "id": "preset-tennis-v2",
        "sportId": "sport-tennis",
        "code": "ROUND_ROBIN",
        "version": 2,
        "name": "Todos contra todos",
        "schemaVersion": 1,
        "defaultParameters": { "doubleRound": false },
        "parametersSchema": [
          {
            "key": "doubleRound",
            "type": "boolean",
            "label": "Doble vuelta",
            "required": false
          },
          {
            "key": "format",
            "type": "enum",
            "label": "Categoría de juego",
            "required": true,
            "options": [
              { "value": "SINGLES", "label": "Singles" },
              { "value": "DOUBLES", "label": "Dobles" }
            ]
          }
        ]
      }
    ]
  }
}
```
