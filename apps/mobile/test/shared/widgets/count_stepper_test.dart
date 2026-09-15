import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/shared/widgets/count_stepper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host({required int value, int min = 1, int max = 8, ValueChanged<int>? onChanged}) =>
    MaterialApp(
      home: Scaffold(
        body: CountStepper(
          value: value,
          min: min,
          max: max,
          onChanged: onChanged ?? (_) {},
        ),
      ),
    );

Finder get _minusButton => find.byIcon(AppIcons.remove);
Finder get _plusButton => find.byIcon(AppIcons.add);

void main() {
  group('CountStepper', () {
    testWidgets('disables and dims the "−" button at min, ignoring taps', (tester) async {
      var called = false;
      await tester.pumpWidget(
        _host(value: 2, min: 2, max: 8, onChanged: (_) => called = true),
      );

      final iconWidget = tester.widget<Icon>(_minusButton);
      expect(iconWidget.color, Theme.of(tester.element(_minusButton)).colorScheme.onSurface.withValues(alpha: 0.38));

      await tester.tap(find.ancestor(of: _minusButton, matching: find.byType(GestureDetector)).first);
      await tester.pump();
      expect(called, isFalse);
    });

    testWidgets('increments by 1 immediately when "+" is tapped below max', (tester) async {
      int? newValue;
      await tester.pumpWidget(
        _host(value: 3, max: 8, onChanged: (v) => newValue = v),
      );

      await tester.tap(find.ancestor(of: _plusButton, matching: find.byType(GestureDetector)).first);
      await tester.pump();

      expect(newValue, 4);
    });

    testWidgets('disables and dims the "+" button at max, ignoring taps', (tester) async {
      var called = false;
      await tester.pumpWidget(
        _host(value: 8, max: 8, onChanged: (_) => called = true),
      );

      final iconWidget = tester.widget<Icon>(_plusButton);
      expect(iconWidget.color, Theme.of(tester.element(_plusButton)).colorScheme.onSurface.withValues(alpha: 0.38));

      await tester.tap(find.ancestor(of: _plusButton, matching: find.byType(GestureDetector)).first);
      await tester.pump();
      expect(called, isFalse);
    });

    testWidgets('decrements by 1 immediately when "−" is tapped above min', (tester) async {
      int? newValue;
      await tester.pumpWidget(
        _host(value: 3, min: 1, onChanged: (v) => newValue = v),
      );

      await tester.tap(find.ancestor(of: _minusButton, matching: find.byType(GestureDetector)).first);
      await tester.pump();

      expect(newValue, 2);
    });

    testWidgets('renders the current value as text', (tester) async {
      await tester.pumpWidget(_host(value: 5));
      expect(find.text('5'), findsOneWidget);
    });
  });
}
