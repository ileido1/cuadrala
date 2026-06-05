import 'package:cuadrala_mobile/src/shared/widgets/date_strip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('buildDateStripDays', () {
    test('should build N consecutive days starting today when from is now', () {
      final from = DateTime(2026, 6, 2, 15, 30);
      final days = buildDateStripDays(21, from: from);

      expect(days, hasLength(21));
      expect(days.first.offset, 0);
      expect(days.first.isToday, isTrue);
      expect(days.first.date, DateTime(2026, 6, 2));
      expect(days.last.offset, 20);
      expect(days.last.date, DateTime(2026, 6, 22));
    });

    test('should expose stable yyyy-MM-dd key', () {
      final day = buildDateStripDays(1, from: DateTime(2026, 1, 5)).first;
      expect(day.key, '2026-01-05');
    });

    test('should map weekday to Spanish DOW label', () {
      // 2026-06-02 is a Tuesday → MAR.
      final tuesday = buildDateStripDays(1, from: DateTime(2026, 6, 2)).first;
      expect(tuesday.dowLabel, 'MAR');
      // 2026-06-07 is a Sunday → DOM.
      final sunday = buildDateStripDays(1, from: DateTime(2026, 6, 7)).first;
      expect(sunday.dowLabel, 'DOM');
    });

    test('should map month index to Spanish name', () {
      final day = buildDateStripDays(1, from: DateTime(2026, 6, 2)).first;
      expect(day.monthName, 'Junio');
    });
  });

  group('DateStrip widget', () {
    Widget harness({
      required List<DateStripDay> days,
      required String value,
      required ValueChanged<String> onChanged,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: DateStrip(days: days, value: value, onChanged: onChanged),
        ),
      );
    }

    testWidgets('should show "Hoy" chip when first day selected',
        (tester) async {
      final days = buildDateStripDays(7, from: DateTime(2026, 6, 2));
      await tester.pumpWidget(
        harness(days: days, value: days.first.key, onChanged: (_) {}),
      );

      expect(find.text('Hoy'), findsOneWidget);
      expect(find.text('Junio'), findsOneWidget);
    });

    testWidgets('should show "Mañana" chip when second day selected',
        (tester) async {
      final days = buildDateStripDays(7, from: DateTime(2026, 6, 2));
      await tester.pumpWidget(
        harness(days: days, value: days[1].key, onChanged: (_) {}),
      );

      expect(find.text('Mañana'), findsOneWidget);
    });

    testWidgets('should notify selected key when a day is tapped',
        (tester) async {
      final days = buildDateStripDays(7, from: DateTime(2026, 6, 2));
      String? picked;
      await tester.pumpWidget(
        harness(days: days, value: days.first.key, onChanged: (k) => picked = k),
      );

      // Day 5 of June -> "5" text inside the strip.
      await tester.tap(find.text('5'));
      await tester.pump();

      expect(picked, days[3].key); // 2026-06-05
    });
  });
}
