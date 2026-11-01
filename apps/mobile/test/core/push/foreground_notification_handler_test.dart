import 'package:cuadrala_mobile/src/core/push/foreground_notification_handler.dart';
import 'package:cuadrala_mobile/src/router/routes.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('resolveNotificationNavigation', () {
    test(
      'should not navigate when the quick match proposal screen is already open',
      () {
        final destination = resolveNotificationNavigation(
          eventType: 'QUICK_MATCH_PROPOSAL',
          matchId: null,
          tournamentId: null,
          currentLocation: Routes.quickMatch,
        );

        expect(destination, isNull);
      },
    );

    test(
      'should navigate to quick match when it is not already the open screen',
      () {
        final destination = resolveNotificationNavigation(
          eventType: 'QUICK_MATCH_PROPOSAL',
          matchId: null,
          tournamentId: null,
          currentLocation: Routes.home,
        );

        expect(destination?.route, Routes.quickMatch);
        expect(destination?.replacesStack, isFalse);
      },
    );

    test(
      'should still navigate to a different match detail even while one is open',
      () {
        final destination = resolveNotificationNavigation(
          eventType: 'MATCH_PLAYER_JOINED',
          matchId: 'm-2',
          tournamentId: null,
          currentLocation: Routes.matchDetail('m-1'),
        );

        expect(destination?.route, Routes.matchDetail('m-2'));
      },
    );

    test(
      'should not navigate when a chat notification matches the open match chat',
      () {
        final destination = resolveNotificationNavigation(
          eventType: 'CHAT_MESSAGE',
          matchId: 'm-1',
          tournamentId: null,
          currentLocation: Routes.matchChat('m-1'),
        );

        expect(destination, isNull);
      },
    );
  });
}
