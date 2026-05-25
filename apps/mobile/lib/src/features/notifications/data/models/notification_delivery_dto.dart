enum NotificationType {
  chatMessage,
  matchSlotOpened,
  matchCancelled,
  paymentPending,
  matchPlayerJoined,
  paymentConfirmed,
  unknown,
}

NotificationType notificationTypeFromWire(String raw) {
  return switch (raw) {
    'CHAT_MESSAGE' => NotificationType.chatMessage,
    'MATCH_SLOT_OPENED' => NotificationType.matchSlotOpened,
    'MATCH_CANCELLED' => NotificationType.matchCancelled,
    'PAYMENT_PENDING' => NotificationType.paymentPending,
    'MATCH_PLAYER_JOINED' => NotificationType.matchPlayerJoined,
    'PAYMENT_CONFIRMED' => NotificationType.paymentConfirmed,
    _ => NotificationType.unknown,
  };
}

final class NotificationDeliveryDto {
  const NotificationDeliveryDto({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.readAt,
    required this.deepLink,
  });

  final String id;
  final NotificationType type;
  final String title;
  final String body;
  final DateTime createdAt;
  final DateTime? readAt;
  final String? deepLink;

  bool get isUnread => readAt == null;

  static NotificationDeliveryDto fromJson(Map<String, Object?> json) {
    final event = json['event'];
    var typeRaw = json['type'] as String? ?? '';
    String? matchId;
    if (event is Map<String, Object?>) {
      typeRaw = (event['type'] as String?) ?? typeRaw;
      matchId = event['matchId'] as String?;
    }
    final type = notificationTypeFromWire(typeRaw);
    final title = (json['title'] as String?)?.trim();
    final body = (json['body'] as String?)?.trim();
    return NotificationDeliveryDto(
      id: (json['deliveryId'] ?? json['id']) as String,
      type: type,
      title: title != null && title.isNotEmpty
          ? title
          : _defaultTitleForType(type),
      body: body != null && body.isNotEmpty
          ? body
          : _defaultBodyForType(type),
      deepLink: (json['deepLink'] as String?) ??
          (matchId != null ? '/matches/$matchId' : null),
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] == null ? null : DateTime.parse(json['readAt'] as String),
    );
  }

  static String _defaultTitleForType(NotificationType type) {
    return switch (type) {
      NotificationType.chatMessage => 'Nuevo mensaje',
      NotificationType.matchSlotOpened => 'Se abrió una vacante',
      NotificationType.matchCancelled => 'Partida cancelada',
      NotificationType.paymentPending => 'Pago pendiente',
      NotificationType.matchPlayerJoined => 'Nuevo jugador',
      NotificationType.paymentConfirmed => 'Pago confirmado',
      NotificationType.unknown => 'Notificación',
    };
  }

  static String _defaultBodyForType(NotificationType type) {
    return switch (type) {
      NotificationType.chatMessage =>
        'Tienes un nuevo mensaje en el chat de la partida.',
      NotificationType.matchSlotOpened =>
        'Hay una vacante en una partida que coincide con tus preferencias.',
      NotificationType.matchCancelled => 'Una partida fue cancelada.',
      NotificationType.paymentPending =>
        'Hay un pago pendiente de revisión en tu partida.',
      NotificationType.matchPlayerJoined => 'Alguien se unió a tu partida.',
      NotificationType.paymentConfirmed => 'Tu pago fue confirmado por el club.',
      NotificationType.unknown => '',
    };
  }
}

