import 'package:flutter/material.dart';

final class NotificationDetailScreen extends StatelessWidget {
  const NotificationDetailScreen({super.key, required this.notificationId});

  final String notificationId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: const Key('notification.detail'),
      appBar: AppBar(title: const Text('Notificación')),
      body: Center(child: Text('Notif: $notificationId')),
    );
  }
}

