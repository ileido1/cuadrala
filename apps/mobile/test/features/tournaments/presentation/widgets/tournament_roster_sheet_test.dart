import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_registration_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_roster_sheet.dart';

void main() {
  TournamentRegistrationDto authRegistration({
    required String id,
    required String userId,
    required String userName,
    String status = 'CONFIRMED',
    String? partnerRegistrationId,
  }) => TournamentRegistrationDto(
    id: id,
    tournamentId: 't-1',
    userId: userId,
    userName: userName,
    status: status,
    createdAt: DateTime(2024),
    partnerRegistrationId: partnerRegistrationId,
  );

  TournamentRegistrationDto guestRegistration({
    required String id,
    required String guestName,
    String status = 'PENDING',
    String? guestPhone,
    String? guestEmail,
  }) => TournamentRegistrationDto(
    id: id,
    tournamentId: 't-1',
    status: status,
    createdAt: DateTime(2024),
    registrationType: 'GUEST',
    guestName: guestName,
    guestPhone: guestPhone,
    guestEmail: guestEmail,
  );

  Future<void> pump(
    WidgetTester tester, {
    required List<TournamentRegistrationDto> registrations,
    bool pairedRegistration = false,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TournamentRosterSheet(
            registrations: registrations,
            pairedRegistration: pairedRegistration,
          ),
        ),
      ),
    );
  }

  group('TournamentRosterSheet', () {
    testWidgets('renders every active registrant in an individual tournament', (
      tester,
    ) async {
      await pump(
        tester,
        registrations: [
          authRegistration(id: 'r1', userId: 'u1', userName: 'Ana'),
          guestRegistration(id: 'r2', guestName: 'Carlos'),
        ],
      );

      expect(find.text('Ana'), findsOneWidget);
      expect(find.text('Carlos'), findsOneWidget);
      //? Torneo individual: todo cae en `unpaired` y la pantalla no debe
      //? leerlo como "sin pareja" (ese encabezado es sólo para duplas).
      expect(find.text('Sin pareja'), findsNothing);
    });

    testWidgets('never renders a withdrawn registration', (tester) async {
      await pump(
        tester,
        registrations: [
          authRegistration(id: 'r1', userId: 'u1', userName: 'Ana'),
          authRegistration(
            id: 'r2',
            userId: 'u2',
            userName: 'Baja',
            status: 'WITHDRAWN',
          ),
        ],
      );

      expect(find.text('Ana'), findsOneWidget);
      expect(find.text('Baja'), findsNothing);
    });

    //? Redaction-safety (D9): el sheet nunca lee guestPhone/guestEmail, ni
    //? siquiera cuando el fixture los trae — la API ya los null-ea para un
    //? no-organizador, pero este widget no tiene ninguna vía de organizador
    //? que pueda saltarse eso.
    testWidgets('never renders guest phone or email even if present', (
      tester,
    ) async {
      await pump(
        tester,
        registrations: [
          guestRegistration(
            id: 'r1',
            guestName: 'Carlos',
            guestPhone: '+58 412 0000000',
            guestEmail: 'carlos@example.com',
          ),
        ],
      );

      expect(find.text('Carlos'), findsOneWidget);
      expect(find.textContaining('+58'), findsNothing);
      expect(find.textContaining('@'), findsNothing);
    });

    testWidgets(
      'groups a paired tournament into pair rows and a Sin pareja bucket',
      (tester) async {
        await pump(
          tester,
          pairedRegistration: true,
          registrations: [
            authRegistration(
              id: 'r1',
              userId: 'u1',
              userName: 'Ana',
              partnerRegistrationId: 'r2',
            ),
            authRegistration(
              id: 'r2',
              userId: 'u2',
              userName: 'Bea',
              partnerRegistrationId: 'r1',
            ),
            authRegistration(id: 'r3', userId: 'u3', userName: 'Cami'),
          ],
        );

        expect(find.text('Ana · Bea'), findsOneWidget);
        expect(find.text('Sin pareja'), findsOneWidget);
        expect(find.text('Cami'), findsOneWidget);
      },
    );

    testWidgets('shows an empty-state message when nobody is registered', (
      tester,
    ) async {
      await pump(tester, registrations: const []);

      expect(find.text('Todavía no hay nadie anotado.'), findsOneWidget);
    });
  });
}
