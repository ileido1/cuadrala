import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/notifications/data/models/notification_delivery_dto.dart';
import 'notification_destination.dart';

/// Overlay entry key for the active foreground notification.
final _notificationKey = GlobalKey<_ForegroundNotificationState>();

/// Shows a foreground FCM notification as a floating snackbar-style banner.
/// Listens to [FirebaseMessaging.onMessage] and displays each incoming message
/// as a dismissable overlay. Tapping navigates to the relevant screen.
final class ForegroundNotificationHandler extends StatefulWidget {
  const ForegroundNotificationHandler({required this.child, super.key});

  final Widget child;

  /// Returns whether a foreground notification is currently being shown.
  static bool get isShowing =>
      _notificationKey.currentState?._isShowing ?? false;

  @override
  State<ForegroundNotificationHandler> createState() =>
      _ForegroundNotificationState();
}

class _ForegroundNotificationState extends State<ForegroundNotificationHandler> {
  bool _isShowing = false;
  StreamSubscription<RemoteMessage>? _subscription;

  @override
  void initState() {
    super.initState();
    _listenToForegroundMessages();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _dismissOverlay();
    super.dispose();
  }

  void _listenToForegroundMessages() {
    _subscription = FirebaseMessaging.onMessage.listen(_onMessage);
  }

  void _onMessage(RemoteMessage message) {
    final data = message.data;
    if (data.isEmpty) return;

    final notification = message.notification;
    final title = notification?.title?.trim() ??
        _defaultTitle(data['eventType'] as String?);
    final body = notification?.body?.trim() ??
        _defaultBody(data['eventType'] as String?);

    _showOverlay(title: title, body: body, data: data);
  }

  void _showOverlay({
    required String title,
    required String body,
    required Map<String, dynamic> data,
  }) {
    if (!mounted) return;

    final overlay = Overlay.of(context);
    final entry = OverlayEntry(
      builder: (context) => _NotificationBanner(
        title: title,
        body: body,
        onDismiss: () {},
        onTap: () {
          _dismissOverlay();
          _navigateFromData(data);
        },
      ),
    );

    _isShowing = true;
    _currentEntry = entry;
    overlay.insert(entry);
  }

  OverlayEntry? _currentEntry;

  void _dismissOverlay() {
    _currentEntry?.remove();
    _currentEntry = null;
    if (mounted) {
      setState(() => _isShowing = false);
    }
  }

  void _navigateFromData(Map<String, dynamic> data) {
    final router = GoRouter.of(context);
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

  String _defaultTitle(String? eventType) {
    if (eventType == null) return 'Notificación';
    final type = notificationTypeFromWire(eventType);
    return switch (type) {
      NotificationType.chatMessage => 'Nuevo mensaje',
      NotificationType.matchSlotOpened => 'Se abrió una vacante',
      NotificationType.matchCancelled => 'Partida cancelada',
      NotificationType.paymentPending => 'Pago pendiente',
      NotificationType.matchPlayerJoined => 'Nuevo jugador',
      NotificationType.paymentConfirmed => 'Pago confirmado',
      NotificationType.tournamentRegistrationReceived => 'Nueva inscripción',
      NotificationType.tournamentRegistrationConfirmed => 'Estás dentro',
      NotificationType.tournamentSchedulePublished => 'Ya está el calendario',
      NotificationType.tournamentStarted => 'Arrancó el torneo',
      NotificationType.unknown => 'Notificación',
    };
  }

  String _defaultBody(String? eventType) {
    if (eventType == null) return '';
    final type = notificationTypeFromWire(eventType);
    return switch (type) {
      NotificationType.chatMessage =>
        'Tienes un nuevo mensaje en el chat de la partida.',
      NotificationType.matchSlotOpened =>
        'Hay una vacante en una partida que coincide con tus preferencias.',
      NotificationType.matchCancelled => 'Una partida fue cancelada.',
      NotificationType.paymentPending =>
        'Hay un pago pendiente de revisión en tu partida.',
      NotificationType.matchPlayerJoined => 'Alguien se unió a tu partida.',
      NotificationType.paymentConfirmed =>
        'Tu pago fue confirmado por el club.',
      NotificationType.tournamentRegistrationReceived =>
        'Alguien se anotó a tu torneo y espera tu confirmación.',
      NotificationType.tournamentRegistrationConfirmed =>
        'El organizador confirmó tu inscripción al torneo.',
      NotificationType.tournamentSchedulePublished =>
        'Se publicó el calendario del torneo. Mirá cuándo te toca jugar.',
      NotificationType.tournamentStarted =>
        'Tu torneo comenzó. Seguí los resultados y la tabla desde la app.',
      NotificationType.unknown => '',
    };
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

/// Floating notification banner shown at the top of the screen.
final class _NotificationBanner extends StatelessWidget {
  const _NotificationBanner({
    required this.title,
    required this.body,
    required this.onDismiss,
    required this.onTap,
  });

  final String title;
  final String body;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Material(
          color: const Color(0xFF1E1E1E),
          elevation: 4,
          child: InkWell(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFF1E1E1E),
                border: Border(
                  bottom: BorderSide(color: Color(0xFF333333), width: 1),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.notifications_active,
                    color: Color(0xFF6BB5FF),
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Color(0xFFFFFFFF),
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (body.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            body,
                            style: const TextStyle(
                              color: Color(0xFFAAAAAA),
                              fontSize: 12,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: onDismiss,
                    child: const Icon(
                      Icons.close,
                      color: Color(0xFF888888),
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
