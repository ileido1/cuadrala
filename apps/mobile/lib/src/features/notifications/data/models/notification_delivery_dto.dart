enum NotificationType {
  chatMessage,
  matchSlotOpened,
  matchCancelled,
  paymentPending,
  unknown,
}

NotificationType notificationTypeFromWire(String raw) {
  return switch (raw) {
    'CHAT_MESSAGE' => NotificationType.chatMessage,
    'MATCH_SLOT_OPENED' => NotificationType.matchSlotOpened,
    'MATCH_CANCELLED' => NotificationType.matchCancelled,
    'PAYMENT_PENDING' => NotificationType.paymentPending,
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
    return NotificationDeliveryDto(
      id: json['id'] as String,
      type: notificationTypeFromWire((json['type'] as String?) ?? ''),
      title: (json['title'] as String?) ?? 'Notificación',
      body: (json['body'] as String?) ?? '',
      deepLink: json['deepLink'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] == null ? null : DateTime.parse(json['readAt'] as String),
    );
  }
}

