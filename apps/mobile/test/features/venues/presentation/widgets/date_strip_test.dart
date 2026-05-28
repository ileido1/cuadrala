import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/presentation/widgets/date_strip.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('DateStrip', () {
    testWidgets('muestra 7 días empezando por hoy', (tester) async {
      final today = DateTime.now();
      await tester.pumpWidget(
        _wrap(
          DateStrip(
            selectedDate: today,
            onDateSelected: (_) {},
          ),
        ),
      );

      // Debe haber 7 day items
      expect(find.byKey(const Key('date_strip')), findsOneWidget);
      expect(find.byType(DateStripItem), findsNWidgets(7));
    });

    testWidgets('día seleccionado tiene key date_strip_selected', (tester) async {
      final today = DateTime.now();
      await tester.pumpWidget(
        _wrap(
          DateStrip(
            selectedDate: today,
            onDateSelected: (_) {},
          ),
        ),
      );

      expect(find.byKey(const Key('date_strip_selected')), findsOneWidget);
    });

    testWidgets('llama onDateSelected al tocar un día', (tester) async {
      final today = DateTime.now();
      DateTime? tappedDate;
      await tester.pumpWidget(
        _wrap(
          DateStrip(
            selectedDate: today,
            onDateSelected: (d) => tappedDate = d,
          ),
        ),
      );

      // Tap primer DateStripItem
      await tester.tap(find.byType(DateStripItem).first);
      await tester.pump();

      expect(tappedDate, isNotNull);
    });

    testWidgets('cada día muestra número de día', (tester) async {
      final today = DateTime.now();
      await tester.pumpWidget(
        _wrap(
          DateStrip(
            selectedDate: today,
            onDateSelected: (_) {},
          ),
        ),
      );

      // Verifica que el día de hoy aparece
      expect(find.text('${today.day}'), findsAtLeast(1));
    });

    testWidgets('cada día muestra abreviatura del día de la semana', (tester) async {
      final today = DateTime.now();
      await tester.pumpWidget(
        _wrap(
          DateStrip(
            selectedDate: today,
            onDateSelected: (_) {},
          ),
        ),
      );

      const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      final todayAbbr = weekdays[today.weekday - 1];
      expect(find.text(todayAbbr), findsAtLeast(1));
    });

    testWidgets('seleccionado cambia al tocar otro día', (tester) async {
      final today = DateTime.now();
      DateTime? lastSelected;
      await tester.pumpWidget(
        _wrap(
          StatefulBuilder(
            builder: (context, setState) {
              return DateStrip(
                selectedDate: lastSelected ?? today,
                onDateSelected: (d) {
                  setState(() => lastSelected = d);
                },
              );
            },
          ),
        ),
      );

      // Tap on the second day item
      await tester.tap(find.byType(DateStripItem).at(1));
      await tester.pump();

      expect(lastSelected, isNotNull);
      expect(lastSelected!.day, isNot(equals(today.day)));
    });
  });
}
