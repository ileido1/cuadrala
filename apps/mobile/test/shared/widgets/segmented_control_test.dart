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
    testWidgets('should show the indicator when value matches an option',
        (tester) async {
      await tester.pumpWidget(_host('LEFT'));
      expect(_indicator, findsOneWidget);
    });

    testWidgets('should hide the indicator when value matches no option',
        (tester) async {
      // 'ANY' es un valor legítimo del dominio que este control no ofrece.
      await tester.pumpWidget(_host('ANY'));
      expect(_indicator, findsNothing);
    });

    testWidgets('should hide the indicator when value is null', (tester) async {
      await tester.pumpWidget(_host(null));
      expect(_indicator, findsNothing);
    });
  });
}
