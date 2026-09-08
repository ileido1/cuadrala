import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_entry_check.dart';

void main() {
  setUpAll(() async => initializeDateFormatting('es_ES'));

  Future<void> pump(
    WidgetTester tester, {
    TournamentEligibility eligibility = TournamentEligibility.eligible,
    String categoryName = 'Masculino 7ma',
    String? playerCategoryName = '7ma',
    double? inscriptionPrice,
    DateTime? startsAt,
    DateTime? registrationClosesAt,
    String? venueName,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TournamentEntryCheck(
            eligibility: eligibility,
            categoryName: categoryName,
            playerCategoryName: playerCategoryName,
            inscriptionPrice: inscriptionPrice,
            startsAt: startsAt,
            registrationClosesAt: registrationClosesAt,
            venueName: venueName,
          ),
        ),
      ),
    );
  }

  group('TournamentEntryCheck', () {
    testWidgets('should always show the level row', (tester) async {
      await pump(tester);

      expect(find.text('NIVEL'), findsOneWidget);
      expect(find.text('Masculino 7ma'), findsOneWidget);
    });

    testWidgets('should tell an eligible player they can enter', (tester) async {
      await pump(tester);

      expect(find.textContaining('Podés entrar'), findsOneWidget);
    });

    //? El candado es la diferencia visible entre "no puedo" y "todavía no
    //? cargó": sin él, el bloqueo se lee como un estado intermedio.
    testWidgets('should lock the level row when the player does not qualify',
        (tester) async {
      await pump(
        tester,
        eligibility: TournamentEligibility.wrongCategory,
        categoryName: 'Masculino 5ta',
      );

      expect(find.byKey(const Key('entry.level.locked')), findsOneWidget);
      expect(find.textContaining('5ta'), findsWidgets);
    });

    //? Una invitación levanta el bloqueo de categoría: el jugador entra aunque
    //? no califique, y la fila tiene que dejar de leerse como un error.
    testWidgets('should clear the lock when the player was invited',
        (tester) async {
      await pump(tester, eligibility: TournamentEligibility.invited);

      expect(find.byKey(const Key('entry.level.locked')), findsNothing);
      expect(find.textContaining('Te invitaron'), findsOneWidget);
    });

    testWidgets('should show a declared price as paid per player',
        (tester) async {
      await pump(tester, inscriptionPrice: 12.5);

      expect(find.text('INSCRIPCIÓN'), findsOneWidget);
      expect(find.textContaining('12.50'), findsOneWidget);
      expect(find.textContaining('Por jugador'), findsOneWidget);
    });

    testWidgets('should say Gratis for a declared zero price', (tester) async {
      await pump(tester, inscriptionPrice: 0);

      expect(find.text('Gratis'), findsOneWidget);
    });

    //? Sin precio declarado no se afirma que sea gratis: no es lo mismo.
    testWidgets('should omit the price row when nothing was declared',
        (tester) async {
      await pump(tester);

      expect(find.text('INSCRIPCIÓN'), findsNothing);
      expect(find.text('Gratis'), findsNothing);
    });

    testWidgets('should show when it starts and when registration closes',
        (tester) async {
      await pump(
        tester,
        startsAt: DateTime.utc(2026, 9, 12, 9),
        registrationClosesAt: DateTime.utc(2026, 9, 11, 20),
      );

      expect(find.text('CUÁNDO'), findsOneWidget);
      expect(find.textContaining('Inscripción hasta'), findsOneWidget);
    });

    testWidgets('should show the venue when there is one', (tester) async {
      await pump(tester, venueName: 'Club Cuádrala');

      expect(find.text('DÓNDE'), findsOneWidget);
      expect(find.text('Club Cuádrala'), findsOneWidget);
    });

    testWidgets('should omit the venue row when none was declared',
        (tester) async {
      await pump(tester);

      expect(find.text('DÓNDE'), findsNothing);
    });
  });
}
