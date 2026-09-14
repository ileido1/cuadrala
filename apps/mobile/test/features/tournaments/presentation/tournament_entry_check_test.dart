import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_entry_check.dart';
import 'package:cuadrala_mobile/src/shared/widgets/dual_price.dart';

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

    testWidgets('should tell an eligible player they can enter', (
      tester,
    ) async {
      await pump(tester);

      expect(find.textContaining('Podés entrar'), findsOneWidget);
    });

    //? El candado es la diferencia visible entre "no puedo" y "todavía no
    //? cargó": sin él, el bloqueo se lee como un estado intermedio.
    testWidgets('should lock the level row when the player does not qualify', (
      tester,
    ) async {
      await pump(
        tester,
        eligibility: TournamentEligibility.wrongCategory,
        categoryName: 'Masculino 5ta',
      );

      expect(find.byKey(const Key('entry.level.locked')), findsOneWidget);
      expect(find.byKey(const Key('entry.level.check')), findsNothing);
      expect(find.textContaining('5ta'), findsWidgets);
    });

    //? "Este torneo es para {cat}." (`cuadrala-torneos.jsx:248`): el jugador
    //? necesita saber para qué categoría es el torneo, no sólo que no entra.
    testWidgets(
      'should name the tournament category when the player does not qualify',
      (tester) async {
        await pump(
          tester,
          eligibility: TournamentEligibility.wrongCategory,
          categoryName: 'Masculino 5ta',
          playerCategoryName: '7ma',
        );

        expect(
          find.text('Jugás 7ma. Este torneo es para Masculino 5ta.'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'should show only the tournament category when the player category is unknown',
      (tester) async {
        await pump(
          tester,
          eligibility: TournamentEligibility.wrongCategory,
          categoryName: 'Masculino 5ta',
          playerCategoryName: null,
        );

        expect(
          find.text('Este torneo es para Masculino 5ta.'),
          findsOneWidget,
        );
      },
    );

    //? Una invitación levanta el bloqueo de categoría: el jugador entra aunque
    //? no califique, y la fila tiene que dejar de leerse como un error.
    testWidgets('should clear the lock when the player was invited', (
      tester,
    ) async {
      await pump(tester, eligibility: TournamentEligibility.invited);

      expect(find.byKey(const Key('entry.level.locked')), findsNothing);
      expect(find.textContaining('Te invitaron'), findsOneWidget);
    });

    //? "Te invitaron: entrás aunque juegues {cat}." (`cuadrala-torneos.jsx:
    //? 247`): sustituye la categoría que juega el jugador, no un texto fijo.
    testWidgets(
      'should substitute the player category in the invited subtitle',
      (tester) async {
        await pump(
          tester,
          eligibility: TournamentEligibility.invited,
          playerCategoryName: '6ta',
        );

        expect(
          find.text('Te invitaron: entrás aunque juegues 6ta.'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'should use a generic category note when invited without a declared category',
      (tester) async {
        await pump(
          tester,
          eligibility: TournamentEligibility.invited,
          playerCategoryName: null,
        );

        expect(
          find.text('Te invitaron: entrás aunque juegues otra categoría.'),
          findsOneWidget,
        );
      },
    );

    //? `cuadrala-torneos.jsx:86`: `tone === 'ok'` (elegible o invitado) dibuja
    //? un check verde de 17px al final de la fila NIVEL.
    testWidgets('should show a 17px green check icon when eligible', (
      tester,
    ) async {
      await pump(tester);

      final icon = tester.widget<Icon>(
        find.byKey(const Key('entry.level.check')),
      );
      final scheme = Theme.of(
        tester.element(find.byType(TournamentEntryCheck)),
      ).colorScheme;

      expect(icon.icon, AppIcons.check);
      expect(icon.size, 17);
      expect(icon.color, scheme.primary);
    });

    testWidgets('should show the check icon when invited too', (
      tester,
    ) async {
      await pump(tester, eligibility: TournamentEligibility.invited);

      expect(find.byKey(const Key('entry.level.check')), findsOneWidget);
    });

    testWidgets('should show a declared price as paid per player', (
      tester,
    ) async {
      await pump(tester, inscriptionPrice: 12.5);

      expect(find.text('INSCRIPCIÓN'), findsOneWidget);
      expect(find.textContaining('12.50'), findsOneWidget);
      expect(find.textContaining('Por jugador'), findsOneWidget);
    });

    //? La fila Inscripción usa el widget compartido `DualPrice` (USD + Bs)
    //? en vez de un `Text` a mano, para quedar consistente con el resto de
    //? la app (tarjetas de listado, match card).
    testWidgets('should render a declared price through DualPrice', (
      tester,
    ) async {
      await pump(tester, inscriptionPrice: 12.5);

      expect(find.byType(DualPrice), findsOneWidget);
    });

    testWidgets('should say Gratis for a declared zero price', (tester) async {
      await pump(tester, inscriptionPrice: 0);

      expect(find.text('Gratis'), findsOneWidget);
      expect(find.byType(DualPrice), findsNothing);
    });

    //? La estructura responde siempre las cuatro preguntas sin inventar el dato.
    testWidgets('should show a neutral price row when nothing was declared', (
      tester,
    ) async {
      await pump(tester);

      expect(find.text('INSCRIPCIÓN'), findsOneWidget);
      expect(find.text('Precio por confirmar'), findsOneWidget);
      expect(find.text('Gratis'), findsNothing);
      expect(find.byType(DualPrice), findsNothing);
    });

    testWidgets('should show when it starts and when registration closes', (
      tester,
    ) async {
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

    testWidgets('should show a neutral venue row when none was declared', (
      tester,
    ) async {
      await pump(tester);

      expect(find.text('DÓNDE'), findsOneWidget);
      expect(find.text('Sede por confirmar'), findsOneWidget);
    });
  });
}
