import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/format_parameter_field_def.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart';

/// Records every onChanged call so tests can assert on key/value pairs.
final class _ChangeRecorder {
  final calls = <MapEntry<String, Object?>>[];

  void call(String key, Object? value) => calls.add(MapEntry(key, value));
}

Widget _buildForm({
  required List<FormatParameterFieldDef> fields,
  Map<String, Object?> values = const {},
  required _ChangeRecorder recorder,
}) {
  return MaterialApp(
    home: Scaffold(
      body: DynamicFormatParametersForm(
        fields: fields,
        values: values,
        onChanged: recorder.call,
      ),
    ),
  );
}

Finder _inForm(Finder matching) => find.descendant(
  of: find.byType(DynamicFormatParametersForm),
  matching: matching,
);

void main() {
  late _ChangeRecorder recorder;

  setUp(() => recorder = _ChangeRecorder());

  testWidgets('should render nothing when fields is empty', (tester) async {
    await tester.pumpWidget(_buildForm(fields: const [], recorder: recorder));

    expect(_inForm(find.byType(Column)), findsNothing);
    expect(_inForm(find.byType(ListTile)), findsNothing);
  });

  group('BooleanFieldDef', () {
    const field = BooleanFieldDef(key: 'thirdPlaceMatch', label: 'Tercer puesto');

    testWidgets('should render a switch with the field label', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(find.widgetWithText(SwitchListTile, 'Tercer puesto'), findsOneWidget);
    });

    testWidgets('should call onChanged with true when the switch is toggled on', (
      tester,
    ) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(find.byType(SwitchListTile));

      expect(recorder.calls.single.key, 'thirdPlaceMatch');
      expect(recorder.calls.single.value, true);
    });
  });

  group('IntFieldDef', () {
    const field = IntFieldDef(key: 'rounds', label: 'Rondas', min: 2, max: 5);

    testWidgets('should show min as the value when no value is set', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(_inForm(find.text('2')), findsOneWidget);
    });

    testWidgets('should call onChanged with value + 1 when + is tapped', (tester) async {
      await tester.pumpWidget(
        _buildForm(fields: const [field], values: {'rounds': 3}, recorder: recorder),
      );

      await tester.tap(_inForm(find.byIcon(Icons.add)));

      expect(recorder.calls.single.key, 'rounds');
      expect(recorder.calls.single.value, 4);
    });

    testWidgets('should not call onChanged when + is tapped at max', (tester) async {
      await tester.pumpWidget(
        _buildForm(fields: const [field], values: {'rounds': 5}, recorder: recorder),
      );

      await tester.tap(_inForm(find.byIcon(Icons.add)));

      expect(recorder.calls, isEmpty);
    });

    testWidgets('should not call onChanged when - is tapped at min', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(_inForm(find.byIcon(Icons.remove)));

      expect(recorder.calls, isEmpty);
    });
  });

  group('EnumFieldDef', () {
    const field = EnumFieldDef(
      key: 'modality',
      label: 'Modalidad',
      required: true,
      options: [
        EnumOption(value: 'SINGLES', label: 'Singles'),
        EnumOption(value: 'DOUBLES', label: 'Dobles'),
      ],
    );

    testWidgets('should render one chip per option', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(find.byType(ChoiceChip), findsNWidgets(2));
      expect(find.widgetWithText(ChoiceChip, 'Singles'), findsOneWidget);
      expect(find.widgetWithText(ChoiceChip, 'Dobles'), findsOneWidget);
    });

    testWidgets('should call onChanged with the option value when a chip is tapped', (
      tester,
    ) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(find.widgetWithText(ChoiceChip, 'Dobles'));

      expect(recorder.calls.single.key, 'modality');
      expect(recorder.calls.single.value, 'DOUBLES');
    });

    testWidgets('should mark the label with * when the field is required', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(find.text('Modalidad'), findsOneWidget);
      expect(find.text(' *'), findsOneWidget);
    });
  });
}
