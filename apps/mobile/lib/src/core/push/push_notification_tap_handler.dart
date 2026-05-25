import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:go_router/go_router.dart';

import 'push_notification_navigator.dart';

/// Enlaza apertura de notificaciones push con [GoRouter] (llamar tras crear el router).
void setupPushNotificationTapHandler(GoRouter router) {
  if (kIsWeb) return;

  FirebaseMessaging.onMessageOpenedApp.listen((message) {
    final data = message.data;
    if (data.isEmpty) return;
    navigateFromPushData(router, data);
  });

  FirebaseMessaging.instance.getInitialMessage().then((message) {
    if (message == null) return;
    final data = message.data;
    if (data.isEmpty) return;
    navigateFromPushData(router, data);
  });
}
