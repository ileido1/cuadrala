import 'package:cuadrala_mobile/src/shared/widgets/pill_toggle.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host({required bool value, ValueChanged<bool>? onChanged}) => MaterialApp(
      home: Scaffold(
        body: PillToggle(value: value, onChanged: onChanged ?? (_) {}),
      ),
    );

Finder get _track => find.byType(AnimatedContainer);
Finder get _thumb => find.byType(AnimatedAlign);

void main() {
  group('PillToggle', () {
    testWidgets('when value is true, the thumb sits at the end and the track is green', (tester) async {
      await tester.pumpWidget(_host(value: true));

      final align = tester.widget<AnimatedAlign>(_thumb);
      expect(align.alignment, Alignment.centerRight);

      final container = tester.widget<AnimatedContainer>(_track);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, Theme.of(tester.element(_track)).colorScheme.primary);
    });

    testWidgets('when value is false, the thumb sits at the start and the track is line-strong', (tester) async {
      await tester.pumpWidget(_host(value: false));

      final align = tester.widget<AnimatedAlign>(_thumb);
      expect(align.alignment, Alignment.centerLeft);

      final container = tester.widget<AnimatedContainer>(_track);
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, Theme.of(tester.element(_track)).colorScheme.outline);
    });

    testWidgets('tapping calls onChanged with the flipped value', (tester) async {
      bool? newValue;
      await tester.pumpWidget(_host(value: false, onChanged: (v) => newValue = v));

      await tester.tap(find.byType(GestureDetector));
      await tester.pump();

      expect(newValue, isTrue);
    });
  });
}
