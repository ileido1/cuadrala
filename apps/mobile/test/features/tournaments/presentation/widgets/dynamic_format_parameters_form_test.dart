import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/tournaments/data/models/format_parameter_field_def.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/dynamic_format_parameters_form.dart';
import 'package:cuadrala_mobile/src/shared/widgets/selectable_chip.dart';
import 'package:cuadrala_mobile/src/shared/widgets/segmented_control.dart';

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

    testWidgets('should render a SelectableChip with the field label', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(find.widgetWithText(SelectableChip, 'Tercer puesto'), findsOneWidget);
    });

    testWidgets('should call onChanged with true when the switch is toggled on', (
      tester,
    ) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(find.widgetWithText(SelectableChip, 'Tercer puesto'));

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

      await tester.tap(_inForm(find.byIcon(AppIcons.add)));

      expect(recorder.calls.single.key, 'rounds');
      expect(recorder.calls.single.value, 4);
    });

    testWidgets('should not call onChanged when + is tapped at max', (tester) async {
      await tester.pumpWidget(
        _buildForm(fields: const [field], values: {'rounds': 5}, recorder: recorder),
      );

      await tester.tap(_inForm(find.byIcon(AppIcons.add)));

      expect(recorder.calls, isEmpty);
    });

    testWidgets('should not call onChanged when - is tapped at min', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(_inForm(find.byIcon(AppIcons.remove)));

      expect(recorder.calls, isEmpty);
    });

    testWidgets('should preserve unbounded values without artificial limits', (tester) async {
      const unbounded = IntFieldDef(key: 'wins', label: 'Victorias');
      await tester.pumpWidget(_buildForm(fields: const [unbounded], values: const {'wins': 0}, recorder: recorder));

      await tester.tap(_inForm(find.byIcon(AppIcons.remove)));
      await tester.tap(_inForm(find.byIcon(AppIcons.add)));

      expect(recorder.calls, hasLength(2));
      expect(recorder.calls[0].value, -1);
      expect(recorder.calls[1].value, 1);
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

    testWidgets('should render options with a shared SegmentedControl', (tester) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      expect(find.byType(SegmentedControl<String>), findsOneWidget);
      expect(find.byType(ChoiceChip), findsNothing);
    });

    testWidgets('should call onChanged with the option value when a chip is tapped', (
      tester,
    ) async {
      await tester.pumpWidget(_buildForm(fields: const [field], recorder: recorder));

      await tester.tap(find.text('Dobles'));

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
