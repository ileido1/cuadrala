import 'package:cuadrala_mobile/src/core/push/notification_destination.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('notificationDestination', () {
    test('should open the match chat for a chat message', () {
      final d = notificationDestination(
        eventType: 'CHAT_MESSAGE',
        matchId: 'm-1',
        tournamentId: null,
      );

      expect(d.route, Routes.matchChat('m-1'));
      expect(d.replacesStack, isFalse);
    });

    test('should open the match detail for the match events', () {
      //? MATCH_CANCELLED estaba contemplado solo en la copia del handler de
      //? foreground; por push desde background caía al listado de avisos.
      for (final type in [
        'MATCH_PLAYER_JOINED',
        'PAYMENT_CONFIRMED',
        'PAYMENT_PENDING',
        'MATCH_CANCELLED',
      ]) {
        final d = notificationDestination(
          eventType: type,
          matchId: 'm-1',
          tournamentId: null,
        );
        expect(d.route, Routes.matchDetail('m-1'), reason: type);
      }
    });

    //? El sujeto del evento pasó a ser partido O torneo. Antes el navegador
    //? leía solo `matchId` y mandaba al listado de avisos cualquier cosa que no
    //? fuera un partido, así que las de torneo no llevaban a ningún lado.
    test('should open the tournament for every tournament event', () {
      const types = [
        'TOURNAMENT_REGISTRATION_RECEIVED',
        'TOURNAMENT_REGISTRATION_CONFIRMED',
        'TOURNAMENT_SCHEDULE_PUBLISHED',
        'TOURNAMENT_STARTED',
      ];

      for (final type in types) {
        final d = notificationDestination(
          eventType: type,
          matchId: null,
          tournamentId: 't-1',
        );
        expect(d.route, Routes.tournamentDetail('t-1'), reason: type);
        expect(d.replacesStack, isFalse, reason: type);
      }
    });

    test('should fall back to the notification list when there is no subject', () {
      final d = notificationDestination(
        eventType: 'TOURNAMENT_STARTED',
        matchId: null,
        tournamentId: null,
      );

      expect(d.route, Routes.avisos);
      expect(d.replacesStack, isTrue);
    });

    test('should fall back to the notification list for an unknown event', () {
      final d = notificationDestination(
        eventType: 'ALGO_NUEVO',
        matchId: 'm-1',
        tournamentId: null,
      );

      expect(d.route, Routes.avisos);
      expect(d.replacesStack, isTrue);
    });
  });

  group('notificationDestinationFromDeepLink', () {
    test('should read the tournament id out of the API deep link', () {
      final d = notificationDestinationFromDeepLink(
        '/tournaments/t-9',
        eventType: 'TOURNAMENT_SCHEDULE_PUBLISHED',
      );

      expect(d?.route, Routes.tournamentDetail('t-9'));
    });

    test('should read the match id out of the API deep link', () {
      final d = notificationDestinationFromDeepLink(
        '/matches/m-9',
        eventType: 'CHAT_MESSAGE',
      );

      expect(d?.route, Routes.matchChat('m-9'));
    });

    test('should return null for a link it does not understand', () {
      expect(notificationDestinationFromDeepLink('/otra-cosa/1', eventType: 'X'), isNull);
      expect(notificationDestinationFromDeepLink(null, eventType: 'X'), isNull);
    });
  });
}
