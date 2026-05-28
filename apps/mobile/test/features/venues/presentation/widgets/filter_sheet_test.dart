import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/venues/presentation/widgets/filter_sheet.dart';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('VenueFilterSheet', () {
    testWidgets('muestra chips para cada deporte disponible', (tester) async {
      await tester.pumpWidget(
        _wrap(
          VenueFilterSheet(
            availableSports: const ['PADEL', 'TENNIS'],
            selectedSport: null,
            indoorOnly: false,
            onSportSelected: (_) {},
            onIndoorChanged: (_) {},
          ),
        ),
      );
      expect(find.text('PADEL'), findsOneWidget);
      expect(find.text('TENNIS'), findsOneWidget);
    });

    testWidgets('muestra chip "Todos" para limpiar sport', (tester) async {
      await tester.pumpWidget(
        _wrap(
          VenueFilterSheet(
            availableSports: const ['PADEL'],
            selectedSport: 'PADEL',
            indoorOnly: false,
            onSportSelected: (_) {},
            onIndoorChanged: (_) {},
          ),
        ),
      );
      expect(find.text('Todos'), findsOneWidget);
    });

    testWidgets('llama onSportSelected con el deporte tapeado', (tester) async {
      String? selected;
      await tester.pumpWidget(
        _wrap(
          VenueFilterSheet(
            availableSports: const ['PADEL', 'TENNIS'],
            selectedSport: null,
            indoorOnly: false,
            onSportSelected: (s) => selected = s,
            onIndoorChanged: (_) {},
          ),
        ),
      );
      await tester.tap(find.text('TENNIS'));
      expect(selected, 'TENNIS');
    });

    testWidgets('llama onSportSelected con null al tapear "Todos"', (tester) async {
      String? selected = 'PADEL';
      await tester.pumpWidget(
        _wrap(
          VenueFilterSheet(
            availableSports: const ['PADEL'],
            selectedSport: 'PADEL',
            indoorOnly: false,
            onSportSelected: (s) => selected = s,
            onIndoorChanged: (_) {},
          ),
        ),
      );
      await tester.tap(find.text('Todos'));
      expect(selected, isNull);
    });

    testWidgets('toggle indoor llama onIndoorChanged', (tester) async {
      bool? indoorValue;
      await tester.pumpWidget(
        _wrap(
          VenueFilterSheet(
            availableSports: const ['PADEL'],
            selectedSport: null,
            indoorOnly: false,
            onSportSelected: (_) {},
            onIndoorChanged: (v) => indoorValue = v,
          ),
        ),
      );
      await tester.tap(find.byType(Switch));
      expect(indoorValue, isTrue);
    });
  });
}
