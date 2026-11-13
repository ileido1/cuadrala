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
  tournamentMatchNeedsAttention,
  quickMatchProposal,
  matchResultReminder,
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
    NotificationType.tournamentMatchNeedsAttention =>
      'TOURNAMENT_MATCH_NEEDS_ATTENTION',
    NotificationType.quickMatchProposal => 'QUICK_MATCH_PROPOSAL',
    NotificationType.matchResultReminder => 'MATCH_RESULT_REMINDER',
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
    'TOURNAMENT_SCHEDULE_PUBLISHED' =>
      NotificationType.tournamentSchedulePublished,
    'TOURNAMENT_STARTED' => NotificationType.tournamentStarted,
    'TOURNAMENT_MATCH_NEEDS_ATTENTION' =>
      NotificationType.tournamentMatchNeedsAttention,
    'QUICK_MATCH_PROPOSAL' => NotificationType.quickMatchProposal,
    'MATCH_RESULT_REMINDER' => NotificationType.matchResultReminder,
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
          : notificationDefaultTitle(type),
      body: body != null && body.isNotEmpty
          ? body
          : notificationDefaultBody(type),
      //? El sujeto puede ser un partido o un torneo; antes solo se contemplaba
      //? el partido y las notificaciones de torneo quedaban sin destino.
      deepLink:
          (json['deepLink'] as String?) ??
          (tournamentId != null
              ? '/tournaments/$tournamentId'
              : matchId != null
              ? '/matches/$matchId'
              : null),
      createdAt: DateTime.parse(json['createdAt'] as String),
      readAt: json['readAt'] == null
          ? null
          : DateTime.parse(json['readAt'] as String),
    );
  }
}

//? Texto por defecto de cada tipo cuando la API no manda título/cuerpo. Lo
//? comparten la bandeja in-app y el banner de foreground: antes cada uno tenía
//? su copia y un tipo nuevo había que agregarlo en los dos lados.

/// Título por defecto de una notificación de tipo [type].
String notificationDefaultTitle(NotificationType type) {
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
    NotificationType.tournamentMatchNeedsAttention =>
      'Un partido necesita horario',
    NotificationType.quickMatchProposal => 'Encontramos una partida',
    NotificationType.matchResultReminder => '¿Cómo salió la partida?',
    NotificationType.unknown => 'Notificación',
  };
}

/// Cuerpo por defecto de una notificación de tipo [type].
String notificationDefaultBody(NotificationType type) {
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
    NotificationType.tournamentMatchNeedsAttention =>
      'Un partido de tu torneo se quedó sin cancha. Reubicalo desde el calendario.',
    NotificationType.quickMatchProposal =>
      'Tenés una propuesta lista para confirmar.',
    NotificationType.matchResultReminder => 'Cargá el resultado de tu partida.',
    NotificationType.unknown => '',
  };
}
