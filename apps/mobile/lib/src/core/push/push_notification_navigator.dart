import 'package:go_router/go_router.dart';

import 'notification_destination.dart';

/// Navega según el payload `data` de FCM (misma lógica que la bandeja in-app).
void navigateFromPushData(GoRouter router, Map<String, dynamic> data) {
  final destination = notificationDestination(
    eventType: data['eventType'] as String? ?? '',
    matchId: data['matchId'] as String?,
    tournamentId: data['tournamentId'] as String?,
  );

  if (destination.replacesStack) {
    router.go(destination.route);
    return;
  }
  router.push(destination.route);
}
