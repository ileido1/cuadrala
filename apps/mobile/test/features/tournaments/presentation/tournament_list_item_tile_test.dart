import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_list_item_tile.dart';

TournamentListItemDto tournamentSV({
  String status = 'OPEN',
  String? venueName,
  double? inscriptionPrice,
  int? maxSlots,
  DateTime? registrationClosesAt,
  int registrationCount = 11,
}) =>
    TournamentListItemDto(
      id: 'tournament-1',
      name: 'Copa Cuádrala',
      status: status,
      sportName: 'Padel',
      categoryName: 'Masculino 7ma',
      startsAt: DateTime.utc(2026, 9, 12, 9),
      registrationCount: registrationCount,
      venueName: venueName,
      inscriptionPrice: inscriptionPrice,
      maxSlots: maxSlots,
      registrationClosesAt: registrationClosesAt,
    );

void main() {
  setUpAll(() async => initializeDateFormatting('es_ES'));

  Future<void> pump(WidgetTester tester, TournamentListItemDto t) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: TournamentListItemTile(tournament: t)),
      ),
    );
  }

  group('TournamentListItemTile', () {
    testWidgets('should name the tournament and its category', (tester) async {
      await pump(tester, tournamentSV());

      expect(find.text('Copa Cuádrala'), findsOneWidget);
      expect(find.text('Masculino 7ma'), findsOneWidget);
    });

    //? El bug que motivó el rediseño: la tarjeta traducía REGISTRATION_OPEN /
    //? FINISHED, que no existen, y OPEN caía en el default mostrando el enum.
    testWidgets('should never show the raw status enum', (tester) async {
      for (final status in ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED']) {
        await pump(tester, tournamentSV(status: status));

        expect(find.text(status), findsNothing, reason: '$status salió crudo');
      }
    });

    testWidgets('should show the venue when the organizer declared one',
        (tester) async {
      await pump(tester, tournamentSV(venueName: 'Club Cuádrala'));

      expect(find.text('Club Cuádrala'), findsOneWidget);
    });

    //? Sin sede declarada no se inventa una fila vacía con el pin.
    testWidgets('should omit the venue row when there is none', (tester) async {
      await pump(tester, tournamentSV());

      expect(find.byKey(const Key('tournament.card.venue')), findsNothing);
    });

    testWidgets('should show occupancy against the declared slots',
        (tester) async {
      await pump(tester, tournamentSV(maxSlots: 16));

      expect(find.text('11/16 inscriptos'), findsOneWidget);
    });

    //? Sin cupo declarado hay numerador pero no denominador: se dice cuántos
    //? hay, no se inventa un total.
    testWidgets('should count registrations when no slot cap was declared',
        (tester) async {
      await pump(tester, tournamentSV());

      expect(find.text('11 inscriptos'), findsOneWidget);
      expect(find.byKey(const Key('tournament.card.slots')), findsNothing);
    });

    testWidgets('should read a single registration in singular', (tester) async {
      await pump(tester, tournamentSV(registrationCount: 1));

      expect(find.text('1 inscripto'), findsOneWidget);
    });

    testWidgets('should show the price when one was declared', (tester) async {
      await pump(tester, tournamentSV(inscriptionPrice: 12.5));

      expect(find.textContaining('12.50'), findsOneWidget);
    });

    //? "Gratis declarado" y "sin declarar" no son lo mismo.
    testWidgets('should say Gratis for a declared zero price', (tester) async {
      await pump(tester, tournamentSV(inscriptionPrice: 0));

      expect(find.text('Gratis'), findsOneWidget);
    });

    testWidgets('should omit the price when it was not declared',
        (tester) async {
      await pump(tester, tournamentSV());

      expect(find.byKey(const Key('tournament.card.price')), findsNothing);
      expect(find.text('Gratis'), findsNothing);
    });

    testWidgets('should announce when the registration closes', (tester) async {
      await pump(
        tester,
        tournamentSV(registrationClosesAt: DateTime.utc(2026, 9, 11, 20)),
      );

      expect(find.textContaining('cierra'), findsOneWidget);
    });
  });
}
