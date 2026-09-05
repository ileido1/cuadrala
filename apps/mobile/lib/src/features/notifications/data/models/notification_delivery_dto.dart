enum NotificationType {
  chatMessage,
  matchSlotOpened,
  matchCancelled,
  paymentPending,
  matchPlayerJoined,
  paymentConfirmed,
  tournamentRegistrationReceived,
  tournamentRegistrationConfirmed,
  tournamentSchedulePublished,
  tournamentStarted,
  unknown,
}

extension NotificationTypeWire on NotificationType {
  /// Valor tal como lo emite la API. Inverso de [notificationTypeFromWire].
  String get wire => switch (this) {
        NotificationType.chatMessage => 'CHAT_MESSAGE',
        NotificationType.matchSlotOpened => 'MATCH_SLOT_OPENED',
        NotificationType.matchCancelled => 'MATCH_CANCELLED',
        NotificationType.paymentPending => 'PAYMENT_PENDING',
        NotificationType.matchPlayerJoined => 'MATCH_PLAYER_JOINED',
        NotificationType.paymentConfirmed => 'PAYMENT_CONFIRMED',
        NotificationType.tournamentRegistrationReceived =>
          'TOURNAMENT_REGISTRATION_RECEIVED',
        NotificationType.tournamentRegistrationConfirmed =>
          'TOURNAMENT_REGISTRATION_CONFIRMED',
        NotificationType.tournamentSchedulePublished =>
          'TOURNAMENT_SCHEDULE_PUBLISHED',
        NotificationType.tournamentStarted => 'TOURNAMENT_STARTED',
        NotificationType.unknown => '',
      };
}

NotificationType notificationTypeFromWire(String raw) {
  return switch (raw) {
    'CHAT_MESSAGE' => NotificationType.chatMessage,
    'MATCH_SLOT_OPENED' => NotificationType.matchSlotOpened,
    'MATCH_CANCELLED' => NotificationType.matchCancelled,
    'PAYMENT_PENDING' => NotificationType.paymentPending,
    'MATCH_PLAYER_JOINED' => NotificationType.matchPlayerJoined,
    'PAYMENT_CONFIRMED' => NotificationType.paymentConfirmed,
    'TOURNAMENT_REGISTRATION_RECEIVED' =>
      NotificationType.tournamentRegistrationReceived,
    'TOURNAMENT_REGISTRATION_CONFIRMED' =>
      NotificationType.tournamentRegistrationConfirmed,
    'TOURNAMENT_SCHEDULE_PUBLISHED' => NotificationType.tournamentSchedulePublished,
    'TOURNAMENT_STARTED' => NotificationType.tournamentStarted,
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
    String? tournamentId;
    if (event is Map<String, Object?>) {
      typeRaw = (event['type'] as String?) ?? typeRaw;
      matchId = event['matchId'] as String?;
      tournamentId = event['tournamentId'] as String?;
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
      //? El sujeto puede ser un partido o un torneo; antes solo se contemplaba
      //? el partido y las notificaciones de torneo quedaban sin destino.
      deepLink: (json['deepLink'] as String?) ??
          (tournamentId != null
              ? '/tournaments/$tournamentId'
              : matchId != null
                  ? '/matches/$matchId'
                  : null),
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
      NotificationType.tournamentRegistrationReceived => 'Nueva inscripción',
      NotificationType.tournamentRegistrationConfirmed => 'Estás dentro',
      NotificationType.tournamentSchedulePublished => 'Ya está el calendario',
      NotificationType.tournamentStarted => 'Arrancó el torneo',
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
}

