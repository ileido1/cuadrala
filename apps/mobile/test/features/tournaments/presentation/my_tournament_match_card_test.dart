import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/my_tournament_match_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/my_tournament_match_card.dart';

MyTournamentMatchDto matchSV({
  DateTime? scheduledAt,
  String? courtName,
  String? myResponse,
  String decision = 'PENDING',
  List<String> partners = const [],
}) =>
    MyTournamentMatchDto(
      roundNumber: 1,
      matchNumber: 2,
      scheduledAt: scheduledAt,
      courtName: courtName,
      partners: partners,
      opponents: const ['Lucía', 'Diego'],
      myResponse: myResponse,
      decision: decision,
    );

void main() {
  late List<String> answers;

  setUpAll(() async => initializeDateFormatting('es_ES'));
  setUp(() => answers = []);

  Future<void> pump(WidgetTester tester, MyTournamentMatchDto m, {bool busy = false}) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MyTournamentMatchCard(
            match: m,
            busy: busy,
            onRespond: answers.add,
          ),
        ),
      ),
    );
  }

  group('MyTournamentMatchCard', () {

    testWidgets('should say who the player faces', (tester) async {
      await pump(tester, matchSV());

      expect(find.text('vs Lucía · Diego'), findsOneWidget);
    });

    testWidgets('should name the partner in a pairs tournament', (tester) async {
      await pump(tester, matchSV(partners: ['Marcos']));

      expect(find.text('Con Marcos'), findsOneWidget);
    });

    //? Inventar una fecha que después cambia es peor que decir que no hay.
    testWidgets('should say the time is not set instead of making one up',
        (tester) async {
      await pump(tester, matchSV());

      expect(find.text('Horario a confirmar'), findsOneWidget);
      expect(find.text('Sin cancha'), findsOneWidget);
    });

    //? Solo se pregunta cuando hay algo concreto que aceptar.
    testWidgets('should not ask for an answer while there is no court',
        (tester) async {
      await pump(tester, matchSV());

      expect(find.text('Me sirve'), findsNothing);
      expect(find.text('No puedo'), findsNothing);
    });

    testWidgets('should ask for an answer once the court is held', (tester) async {
      await pump(
        tester,
        matchSV(scheduledAt: DateTime(2026, 10, 1, 14), courtName: 'Cancha 1'),
      );

      expect(find.text('Falta tu respuesta'), findsOneWidget);
      expect(find.text('Me sirve'), findsOneWidget);
    });

    testWidgets('should report the accepted answer', (tester) async {
      await pump(
        tester,
        matchSV(scheduledAt: DateTime(2026, 10, 1, 14), courtName: 'Cancha 1'),
      );

      await tester.tap(find.byKey(const Key('tournament.acceptSlot.1.2')));
      await tester.pump();

      expect(answers, ['ACCEPTED']);
    });

    //? "Ya contesté, falta el resto" es distinto de "no contestaste": la app
    //? solo tiene que pedirte algo en el segundo caso.
    testWidgets('should distinguish having answered from owing an answer',
        (tester) async {
      await pump(
        tester,
        matchSV(
          scheduledAt: DateTime(2026, 10, 1, 14),
          courtName: 'Cancha 1',
          myResponse: 'ACCEPTED',
        ),
      );

      expect(find.text('Esperando al resto'), findsOneWidget);
      expect(find.text('Falta tu respuesta'), findsNothing);
    });

    testWidgets('should stop asking once the match is settled', (tester) async {
      await pump(
        tester,
        matchSV(
          scheduledAt: DateTime(2026, 10, 1, 14),
          courtName: 'Cancha 1',
          decision: 'ACCEPTED',
        ),
      );

      expect(find.text('Confirmado'), findsOneWidget);
      expect(find.text('Me sirve'), findsNothing);
    });
  });
}
