import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/tournament_roster_grouping.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_pairing_section.dart';

TournamentRegistrationDto regSV(String id, {String? partner}) =>
    TournamentRegistrationDto(
      id: id,
      tournamentId: 't-1',
      userId: 'user-$id',
      userName: 'Jugador $id',
      status: 'CONFIRMED',
      createdAt: DateTime(2026),
      partnerRegistrationId: partner,
    );

void main() {
  late List<List<String>> paired;
  late List<String> unpaired;

  setUp(() {
    paired = [];
    unpaired = [];
  });

  Future<void> pump(
    WidgetTester tester,
    List<TournamentRegistrationDto> registrations, {
    bool canManage = true,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: TournamentPairingSection(
              roster: groupRosterIntoPairs(registrations: registrations, paired: true),
              canManage: canManage,
              busyRegistrationId: null,
              onPair: (a, b) => paired.add([a, b]),
              onUnpair: unpaired.add,
            ),
          ),
        ),
      ),
    );
  }

  group('TournamentPairingSection', () {
    testWidgets('should show a formed pair as a single row', (tester) async {
      await pump(tester, [regSV('a', partner: 'b'), regSV('b', partner: 'a')]);

      expect(find.text('Jugador a · Jugador b'), findsOneWidget);
      expect(find.textContaining('Sin pareja'), findsNothing);
    });

    //? Es lo que el organizador necesita ver: una inscripción sin dupla frena
    //? la generación del cuadro.
    testWidgets('should count the players still without a partner', (tester) async {
      await pump(tester, [regSV('a'), regSV('b'), regSV('c')]);

      expect(find.text('Sin pareja (3)'), findsOneWidget);
    });

    //? El gesto es tocar dos: el primero queda marcado, el segundo cierra.
    testWidgets('should pair two players after tapping both', (tester) async {
      await pump(tester, [regSV('a'), regSV('b')]);

      await tester.tap(find.byKey(const Key('tournament.unpaired.a')));
      await tester.pump();
      expect(paired, isEmpty, reason: 'un solo toque no arma la dupla');
      expect(find.text('Ahora tocá a su compañero.'), findsOneWidget);

      await tester.tap(find.byKey(const Key('tournament.unpaired.b')));
      await tester.pump();

      expect(paired, [
        ['a', 'b'],
      ]);
    });

    testWidgets('should let the same player be deselected', (tester) async {
      await pump(tester, [regSV('a'), regSV('b')]);

      await tester.tap(find.byKey(const Key('tournament.unpaired.a')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('tournament.unpaired.a')));
      await tester.pump();

      expect(paired, isEmpty);
      expect(find.text('Tocá dos jugadores para armar la dupla.'), findsOneWidget);
    });

    testWidgets('should let the organizer undo a pair', (tester) async {
      await pump(tester, [regSV('a', partner: 'b'), regSV('b', partner: 'a')]);

      await tester.tap(find.byKey(const Key('tournament.unpair.a')));
      await tester.pump();

      expect(unpaired, ['a']);
    });

    //? El emparejamiento es del organizador; el resto solo mira.
    testWidgets('should not offer any pairing action to a non-organizer',
        (tester) async {
      await pump(
        tester,
        [regSV('a', partner: 'b'), regSV('b', partner: 'a'), regSV('c')],
        canManage: false,
      );

      expect(find.byKey(const Key('tournament.unpair.a')), findsNothing);
      expect(find.text('Todavía esperan compañero.'), findsOneWidget);

      await tester.tap(find.byKey(const Key('tournament.unpaired.c')));
      await tester.pump();
      expect(paired, isEmpty);
    });
  });
}
