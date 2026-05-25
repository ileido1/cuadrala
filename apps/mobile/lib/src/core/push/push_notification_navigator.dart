import 'dart:developer' as developer;

import 'package:go_router/go_router.dart';

import '../../features/notifications/data/models/notification_delivery_dto.dart';
import '../../router/routes.dart';

/// Navega según el payload `data` de FCM (misma lógica que la bandeja in-app).
void navigateFromPushData(GoRouter router, Map<String, dynamic> data) {
  final eventType = data['eventType'] as String? ?? '';
  final matchId = data['matchId'] as String?;
  if (matchId == null || matchId.isEmpty) {
    router.go(Routes.avisos);
    return;
  }

  final type = notificationTypeFromWire(eventType);
  if (type == NotificationType.chatMessage) {
    router.push(Routes.matchChat(matchId));
    return;
  }
  if (type == NotificationType.matchPlayerJoined ||
      type == NotificationType.paymentConfirmed ||
      type == NotificationType.paymentPending) {
    router.push(Routes.matchDetail(matchId));
    return;
  }
  developer.log(
    'Push sin ruta específica: $eventType',
    name: 'PushNotificationNavigator',
  );
  router.go(Routes.avisos);
}
