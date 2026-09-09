# Dynamic Format Parameters Specification

## Purpose

Generic form component that renders tournament format parameter inputs (boolean/int/enum) dynamically based on a schema provided by the backend. Eliminates hardcoded sport-specific logic from tournament creation UI.

## Requirements

### Requirement: Render Parameters by Field Type

The widget **MUST** accept a list of field definitions and render an input control for each field based on its `type`:
- `type: 'boolean'` → SwitchListTile
- `type: 'int'` → StepperTiny (with min/max bounds)
- `type: 'enum'` → SegmentedControl<String>

Each field **MUST** include: `key`, `type`, `label`, `required` (optional), and type-specific metadata (min/max for int, options array for enum).

#### Scenario: Render Boolean Field

- GIVEN a field `{ key: "doubleRound", type: "boolean", label: "Doble vuelta" }`
- WHEN the widget renders
- THEN a SwitchListTile appears with label "Doble vuelta" and toggle state

#### Scenario: Render Int Field with Bounds

- GIVEN a field `{ key: "rounds", type: "int", label: "Rondas", min: 1, max: 50 }`
- WHEN the widget renders
- THEN a StepperTiny appears with +/- buttons, value display, and bounds enforced (1–50)

#### Scenario: Render Enum Field

- GIVEN a field `{ key: "format", type: "enum", label: "Categoría de juego", options: [{value: "SINGLES", label: "Singles"}, {value: "DOUBLES", label: "Dobles"}] }`
- WHEN the widget renders
- THEN a SegmentedControl shows two segments: "Singles" / "Dobles"

### Requirement: Emit Value Changes

The widget **MUST** accept an `onChanged` callback and invoke it whenever a field value changes: `onChanged(fieldKey, newValue)`.

#### Scenario: Boolean Change

- GIVEN user toggles a switch for `doubleRound`
- WHEN the switch state changes
- THEN `onChanged("doubleRound", true/false)` fires

#### Scenario: Enum Selection

- GIVEN user taps "Dobles" on the enum SegmentedControl
- WHEN the selection changes from "SINGLES"
- THEN `onChanged("format", "DOUBLES")` fires

### Requirement: Validate Required Fields

The widget **SHOULD** display a visual indicator (e.g., asterisk or color) for fields where `required: true`, but **MUST** allow the parent (create_tournament_screen) to validate completeness before submission.

#### Scenario: Required Field Indicator

- GIVEN a field with `required: true`
- WHEN the widget renders
- THEN the label includes a visual marker (e.g., red asterisk or bold)
- AND the parent is responsible for blocking submission if the field is empty

### Requirement: Handle Absence of Schema

The widget **MUST** render nothing (empty state) if the schema is null or empty, without errors.

#### Scenario: No Parameters

- GIVEN `fields: []` or `fields: null`
- WHEN the widget renders
- THEN no inputs appear, no errors

## API Contract

```dart
class DynamicFormatParametersForm extends StatelessWidget {
  final List<FormatParameterFieldDef> fields;
  final Map<String, Object?> values;
  final void Function(String key, Object? value) onChanged;
}

abstract class FormatParameterFieldDef {
  String get key;
  String get type; // 'boolean', 'int', 'enum'
  String get label;
  bool? get required;
}

class BooleanFieldDef implements FormatParameterFieldDef {
  final String key;
  final String type = 'boolean';
  final String label;
  final bool? required;
}

class IntFieldDef implements FormatParameterFieldDef {
  final String key;
  final String type = 'int';
  final String label;
  final bool? required;
  final int? min;
  final int? max;
}

class EnumFieldDef implements FormatParameterFieldDef {
  final String key;
  final String type = 'enum';
  final String label;
  final bool? required;
  final List<EnumOption> options;
}

class EnumOption {
  final String value;
  final String label;
}
```
