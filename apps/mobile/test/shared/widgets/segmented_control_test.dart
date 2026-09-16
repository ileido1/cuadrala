import 'package:cuadrala_mobile/src/shared/widgets/segmented_control.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// El indicador deslizante es la única señal visual de "esto está elegido".
/// Si se dibuja cuando el valor no coincide con ninguna opción, la UI miente y
/// el usuario cree haber elegido algo que la validación va a rechazar.
Widget _host(String? value) => MaterialApp(
  home: Scaffold(
    body: SegmentedControl<String>(
      options: const [
        SegmentedOption(value: 'RIGHT', label: 'Drive'),
        SegmentedOption(value: 'LEFT', label: 'Revés'),
      ],
      value: value,
      onChanged: (_) {},
    ),
  ),
);

Finder get _indicator => find.byType(AnimatedPositioned);

void main() {
  group('SegmentedControl', () {
    testWidgets('a disabled option ignores taps and renders dimmed', (
      tester,
    ) async {
      var changed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SegmentedControl<String>(
              options: const [
                SegmentedOption(value: 'RIGHT', label: 'Drive'),
                SegmentedOption(value: 'LEFT', label: 'Revés', enabled: false),
              ],
              value: 'RIGHT',
              onChanged: (_) => changed = true,
            ),
          ),
        ),
      );

      final disabledText = tester.widget<Text>(find.text('Revés'));
      final scheme = Theme.of(tester.element(find.text('Revés'))).colorScheme;
      expect(
        disabledText.style?.color,
        scheme.onSurface.withValues(alpha: 0.38),
      );

      await tester.tap(find.text('Revés'));
      await tester.pump();
      expect(changed, isFalse);
    });

    testWidgets('should show the indicator when value matches an option', (
      tester,
    ) async {
      await tester.pumpWidget(_host('LEFT'));
      expect(_indicator, findsOneWidget);
    });

    testWidgets('should hide the indicator when value matches no option', (
      tester,
    ) async {
      // 'ANY' es un valor legítimo del dominio que este control no ofrece.
      await tester.pumpWidget(_host('ANY'));
      expect(_indicator, findsNothing);
    });

    testWidgets('should hide the indicator when value is null', (tester) async {
      await tester.pumpWidget(_host(null));
      expect(_indicator, findsNothing);
    });

    testWidgets('centers labels vertically inside the full-height segments', (
      tester,
    ) async {
      await tester.pumpWidget(_host('LEFT'));

      final controlCenter = tester.getCenter(
        find.byType(SegmentedControl<String>),
      );
      for (final label in ['Drive', 'Revés']) {
        final labelCenter = tester.getCenter(find.text(label));
        expect((labelCenter.dy - controlCenter.dy).abs(), lessThan(1));
      }
    });
  });
}
