import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_list_item_dto.dart';
import 'package:cuadrala_mobile/src/features/tournaments/presentation/widgets/tournament_list_item_tile.dart';

import '../handoff_copy.dart' as handoff_copy;

TournamentListItemDto tournamentSV({
  String status = 'OPEN',
  String? venueName,
  double? inscriptionPrice,
  int? maxSlots,
  DateTime? registrationClosesAt,
  int registrationCount = 11,
  String categoryId = 'cat-1',
  double? distanceKm,
  String? organizerName,
  String? gender,
}) =>
    TournamentListItemDto(
      id: 'tournament-1',
      name: 'Copa Cuádrala',
      status: status,
      sportName: 'Padel',
      categoryName: 'Masculino 7ma',
      categoryId: categoryId,
      startsAt: DateTime.utc(2026, 9, 12, 9),
      registrationCount: registrationCount,
      venueName: venueName,
      inscriptionPrice: inscriptionPrice,
      maxSlots: maxSlots,
      registrationClosesAt: registrationClosesAt,
      distanceKm: distanceKm,
      organizerName: organizerName,
      gender: gender,
    );

void main() {
  setUpAll(() async => initializeDateFormatting('es_ES'));

  Future<void> pump(
    WidgetTester tester,
    TournamentListItemDto t, {
    String? pendingInvitationId,
    bool isOrganizer = false,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TournamentListItemTile(
            tournament: t,
            pendingInvitationId: pendingInvitationId,
            isOrganizer: isOrganizer,
          ),
        ),
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

    testWidgets('should show the venue placeholder when there is none', (tester) async {
      await pump(tester, tournamentSV());

      expect(find.text('Sede por confirmar'), findsOneWidget);
    });

    testWidgets('should show occupancy against the declared slots',
        (tester) async {
      await pump(tester, tournamentSV(maxSlots: 16));

      expect(find.text('11/16 inscritos'), findsOneWidget);
    });

    //? Sin cupo declarado hay numerador pero no denominador: se dice cuántos
    //? hay, no se inventa un total.
    testWidgets('should count registrations when no slot cap was declared',
        (tester) async {
      await pump(tester, tournamentSV());

      expect(find.text('11 inscritos'), findsOneWidget);
      expect(find.byKey(const Key('tournament.card.slots')), findsNothing);
    });

    testWidgets('should read a single registration in singular', (tester) async {
      await pump(tester, tournamentSV(registrationCount: 1));

      expect(find.text('1 inscrito'), findsOneWidget);
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

    testWidgets('should show a placeholder when the price was not declared',
        (tester) async {
      await pump(tester, tournamentSV());

      expect(find.byKey(const Key('tournament.card.price')), findsNothing);
      expect(find.text('Precio por confirmar'), findsOneWidget);
      expect(find.text('Gratis'), findsNothing);
    });

    testWidgets('should announce when the registration closes', (tester) async {
      await pump(
        tester,
        tournamentSV(registrationClosesAt: DateTime.utc(2026, 9, 11, 20)),
      );

      expect(find.textContaining('cierra'), findsOneWidget);
    });

    //? "Cerca" (M3d): la tarjeta sólo muestra distancia cuando la API la
    //? mandó — eso implica que el listado se filtró con `near`.
    testWidgets('should show the distance next to the venue when the API returned it',
        (tester) async {
      await pump(
        tester,
        tournamentSV(venueName: 'Club Cuádrala', distanceKm: 2.5),
      );

      expect(find.text('Club Cuádrala · 2.5 km'), findsOneWidget);
    });

    testWidgets('should omit the distance when the API did not return it',
        (tester) async {
      await pump(tester, tournamentSV(venueName: 'Club Cuádrala'));

      expect(find.textContaining(' km'), findsNothing);
    });

    //? {org} = venueName, cayendo al nombre del organizador sin sede
    //? (spec "Listado — invitation banner and organizer row"; D7).
    group('invitation banner', () {
      testWidgets(
          'should show "{venueName} te invitó" and the Ver invitación action '
          'when there is a pending invitation and a venue', (tester) async {
        await pump(
          tester,
          tournamentSV(venueName: 'Club Cuádrala'),
          pendingInvitationId: 'invitation-1',
        );

        expect(
          find.text(handoff_copy.invitationBannerTitle('Club Cuádrala')),
          findsOneWidget,
        );
        expect(
          find.text(handoff_copy.invitationBannerAction),
          findsOneWidget,
        );
      });

      testWidgets(
          "should fall back to the organizer's display name when there is "
          'no venue', (tester) async {
        await pump(
          tester,
          tournamentSV(organizerName: 'Padel Country'),
          pendingInvitationId: 'invitation-1',
        );

        expect(
          find.text(handoff_copy.invitationBannerTitle('Padel Country')),
          findsOneWidget,
        );
      });

      testWidgets('should omit the banner without a pending invitation',
          (tester) async {
        await pump(tester, tournamentSV(venueName: 'Club Cuádrala'));

        expect(find.textContaining('te invitó'), findsNothing);
        expect(
          find.text(handoff_copy.invitationBannerAction),
          findsNothing,
        );
      });
    });

    //? `gender` llegó al DTO en M4b-1 (S2) pero quedó sin renderizar a
    //? propósito ("todavía sin renderizar en la tarjeta (M4b-2)") — esta
    //? tarjeta es la última pieza de fidelidad pendiente en el listado.
    group('gender tag', () {
      testWidgets('should show the Spanish gender label next to the category',
          (tester) async {
        await pump(tester, tournamentSV(gender: 'MIXED'));

        expect(
          find.text(handoff_copy.genderTagLabel('MIXED')!),
          findsOneWidget,
        );
      });

      testWidgets('should never show the raw gender enum', (tester) async {
        for (final gender in ['MALE', 'FEMALE', 'MIXED']) {
          await pump(tester, tournamentSV(gender: gender));

          expect(find.text(gender), findsNothing, reason: '$gender salió crudo');
        }
      });

      testWidgets('should omit the tag when no gender was declared',
          (tester) async {
        await pump(tester, tournamentSV());

        expect(find.text('Masculino'), findsNothing);
        expect(find.text('Femenino'), findsNothing);
        expect(find.text('Mixto'), findsNothing);
      });
    });

    group('organizer row', () {
      testWidgets(
          'should show the lime shield organizer row with a chevron when '
          'the viewer organizes the tournament', (tester) async {
        await pump(tester, tournamentSV(), isOrganizer: true);

        expect(
          find.text(handoff_copy.organizerRowTitle('Copa Cuádrala')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('tournament.card.organizerRow')),
          findsOneWidget,
        );
      });

      testWidgets('should omit the organizer row when the viewer does not '
          'organize the tournament', (tester) async {
        await pump(tester, tournamentSV());

        expect(
          find.byKey(const Key('tournament.card.organizerRow')),
          findsNothing,
        );
      });
    });
  });
}
