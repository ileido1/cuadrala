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
  String? roundName,
}) =>
    MyTournamentMatchDto(
      roundNumber: 1,
      matchNumber: 2,
      roundName: roundName,
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
    //? Sin cancha materializada el partido depende de resultados previos del
    //? cuadro, así que el copy exacto del handoff es "Depende del cuadro"
    //? (`README.md:84`), no un genérico "Sin cancha".
    testWidgets('should say the time is not set instead of making one up',
        (tester) async {
      await pump(tester, matchSV());

      expect(find.text('Horario a confirmar'), findsOneWidget);
      expect(find.text('Depende del cuadro'), findsOneWidget);
    });

    //? SINGLE_ELIMINATION manda un nombre cualitativo ya resuelto por la API
    //? (S5): se muestra tal cual, sin inventar nada más.
    testWidgets('should show the qualitative round name when present',
        (tester) async {
      await pump(tester, matchSV(roundName: 'Octavos'));

      expect(find.text('Octavos'), findsOneWidget);
      expect(find.text('Ronda 1'), findsNothing);
    });

    //? ROUND_ROBIN y AMERICANO no tienen "cuartos" ni "semifinal": la API
    //? manda `roundName: null` y la tarjeta cae a "Ronda {roundNumber}".
    testWidgets('should fall back to Ronda {n} when there is no round name',
        (tester) async {
      await pump(tester, matchSV());

      expect(find.text('Ronda 1'), findsOneWidget);
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

    //? Copy verbatim del handoff (`cuadrala-torneos.jsx:371`): la pregunta
    //? solo aparece junto con los botones de responder.
    testWidgets('should show the organizer-proposed-schedule question',
        (tester) async {
      await pump(
        tester,
        matchSV(scheduledAt: DateTime(2026, 10, 1, 14), courtName: 'Cancha 1'),
      );

      expect(
        find.text('El organizador propuso este horario. ¿Te sirve?'),
        findsOneWidget,
      );
    });

    //? Orden del handoff: primario "Me sirve" primero, secundario "No puedo"
    //? después (`cuadrala-torneos.jsx:373-374`).
    testWidgets('should show Me sirve before No puedo', (tester) async {
      await pump(
        tester,
        matchSV(scheduledAt: DateTime(2026, 10, 1, 14), courtName: 'Cancha 1'),
      );

      final acceptX = tester.getTopLeft(find.text('Me sirve')).dx;
      final rejectX = tester.getTopLeft(find.text('No puedo')).dx;
      expect(acceptX, lessThan(rejectX));
    });

    testWidgets('should report the rejected answer', (tester) async {
      await pump(
        tester,
        matchSV(scheduledAt: DateTime(2026, 10, 1, 14), courtName: 'Cancha 1'),
      );

      await tester.tap(find.byKey(const Key('tournament.rejectSlot.1.2')));
      await tester.pump();

      expect(answers, ['REJECTED']);
    });

    //? Copy verbatim del handoff (`cuadrala-torneos.jsx:379`): avisa que el
    //? partido se va a reprogramar, en vez de dejar la pantalla muda.
    testWidgets('should tell the player we notified the organizer after No puedo',
        (tester) async {
      await pump(
        tester,
        matchSV(
          scheduledAt: DateTime(2026, 10, 1, 14),
          courtName: 'Cancha 1',
          myResponse: 'REJECTED',
          decision: 'REJECTED',
        ),
      );

      expect(
        find.text(
          'Avisamos al organizador. Va a reprogramar el partido y te llega el horario nuevo.',
        ),
        findsOneWidget,
      );
      expect(find.text('Me sirve'), findsNothing);
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
      //? Ya contesté: no tiene sentido volver a preguntarme.
      expect(
        find.text('El organizador propuso este horario. ¿Te sirve?'),
        findsNothing,
      );
      expect(find.text('Me sirve'), findsNothing);
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
