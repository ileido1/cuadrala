import 'package:equatable/equatable.dart';

/// Who registered via a [TournamentInviteLinkDto] (REQ-TIL-006). Only
/// present in the listing response, never on creation.
final class TournamentInviteLinkRegistrantDto extends Equatable {
  const TournamentInviteLinkRegistrantDto({
    required this.registrationId,
    required this.type,
    required this.displayName,
    required this.registeredAt,
  });

  final String registrationId;

  /// `AUTHENTICATED` or `GUEST`.
  final String type;

  /// User name (AUTHENTICATED) or `guestName` (GUEST), already resolved by
  /// the backend.
  final String displayName;
  final DateTime registeredAt;

  factory TournamentInviteLinkRegistrantDto.fromJson(
    Map<String, Object?> json,
  ) {
    return TournamentInviteLinkRegistrantDto(
      registrationId: json['registrationId'] as String,
      type: json['type'] as String,
      displayName: json['displayName'] as String,
      registeredAt: DateTime.parse(json['registeredAt'] as String),
    );
  }

  Map<String, Object?> toJson() => {
    'registrationId': registrationId,
    'type': type,
    'displayName': displayName,
    'registeredAt': registeredAt.toIso8601String(),
  };

  @override
  List<Object?> get props => [registrationId, type, displayName, registeredAt];
}

/// DTO for a `TournamentInviteLink` (REQ-TIL-001/002/005/006). The same
/// shape is reused for the creation response (which carries the raw [token],
/// [url] and [deepLink] exactly once — the backend never returns the raw
/// token again) and the listing response (which carries [createdByUserId]
/// and [registrants] but never exposes the token).
final class TournamentInviteLinkDto extends Equatable {
  const TournamentInviteLinkDto({
    required this.id,
    required this.expiresAt,
    required this.maxUses,
    required this.usesCount,
    required this.revokedAt,
    required this.createdAt,
    this.createdByUserId,
    this.token,
    this.url,
    this.deepLink,
    this.registrants = const [],
  });

  final String id;
  final DateTime expiresAt;

  /// `null` = sin tope de usos.
  final int? maxUses;
  final int usesCount;
  final DateTime? revokedAt;
  final DateTime createdAt;

  /// Absent in the creation response; present when listing (REQ-TIL-006).
  final String? createdByUserId;

  /// Raw token: present ONLY in the creation response (REQ-TIL-002). `null`
  /// in the listing response — the backend never returns it again.
  final String? token;
  final String? url;
  final String? deepLink;

  /// Who registered via this link (REQ-TIL-006). Always empty on creation.
  final List<TournamentInviteLinkRegistrantDto> registrants;

  bool get isRevoked => revokedAt != null;

  bool get isExhausted => maxUses != null && usesCount >= maxUses!;

  factory TournamentInviteLinkDto.fromJson(Map<String, Object?> json) {
    final rawRegistrants = json['registrants'];
    return TournamentInviteLinkDto(
      id: json['id'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      maxUses: json['maxUses'] as int?,
      usesCount: json['usesCount'] as int,
      revokedAt: json['revokedAt'] != null
          ? DateTime.parse(json['revokedAt'] as String)
          : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      createdByUserId: json['createdByUserId'] as String?,
      token: json['token'] as String?,
      url: json['url'] as String?,
      deepLink: json['deepLink'] as String?,
      registrants: rawRegistrants is List
          ? rawRegistrants
                .whereType<Map>()
                .map((e) => Map<String, Object?>.from(e))
                .map(TournamentInviteLinkRegistrantDto.fromJson)
                .toList()
          : const [],
    );
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'expiresAt': expiresAt.toIso8601String(),
    'maxUses': maxUses,
    'usesCount': usesCount,
    'revokedAt': revokedAt?.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
    'createdByUserId': createdByUserId,
    'token': token,
    'url': url,
    'deepLink': deepLink,
    'registrants': registrants.map((r) => r.toJson()).toList(),
  };

  @override
  List<Object?> get props => [
    id,
    expiresAt,
    maxUses,
    usesCount,
    revokedAt,
    createdAt,
    createdByUserId,
    token,
    url,
    deepLink,
    registrants,
  ];
}

/// DTO for `GET /public/tournament-invite-links/:token` (REQ-TIL-012). Not a
/// `TournamentInviteLink` itself — it's the tournament preview shown before
/// registering, so it gets its own shape rather than reusing
/// [TournamentInviteLinkDto].
final class TournamentInviteLinkPreviewDto extends Equatable {
  const TournamentInviteLinkPreviewDto({
    required this.tournamentId,
    required this.tournamentName,
    required this.sportName,
    required this.categoryName,
    required this.venueName,
    required this.startsAt,
    required this.status,
    required this.acceptsRegistration,
  });

  final String tournamentId;
  final String tournamentName;
  final String sportName;
  final String categoryName;
  final String? venueName;
  final DateTime? startsAt;
  final String status;

  /// Reflects `isTournamentRosterOpenSV(status)` — informational only, the
  /// backend never throws based on it from the preview endpoint.
  final bool acceptsRegistration;

  factory TournamentInviteLinkPreviewDto.fromJson(Map<String, Object?> json) {
    return TournamentInviteLinkPreviewDto(
      tournamentId: json['tournamentId'] as String,
      tournamentName: json['tournamentName'] as String,
      sportName: json['sportName'] as String,
      categoryName: json['categoryName'] as String,
      venueName: json['venueName'] as String?,
      startsAt: json['startsAt'] != null
          ? DateTime.parse(json['startsAt'] as String)
          : null,
      status: json['status'] as String,
      acceptsRegistration: json['acceptsRegistration'] as bool,
    );
  }

  @override
  List<Object?> get props => [
    tournamentId,
    tournamentName,
    sportName,
    categoryName,
    venueName,
    startsAt,
    status,
    acceptsRegistration,
  ];
}

/// DTO for `POST /public/tournament-invite-links/:token/register`
/// (REQ-TIL-007/008).
final class TournamentInviteLinkRegistrationResultDto extends Equatable {
  const TournamentInviteLinkRegistrationResultDto({
    required this.registrationId,
    required this.registrationType,
    required this.tournamentId,
    required this.status,
  });

  final String registrationId;

  /// `AUTHENTICATED` or `GUEST`.
  final String registrationType;
  final String tournamentId;
  final String status;

  factory TournamentInviteLinkRegistrationResultDto.fromJson(
    Map<String, Object?> json,
  ) {
    return TournamentInviteLinkRegistrationResultDto(
      registrationId: json['registrationId'] as String,
      registrationType: json['registrationType'] as String,
      tournamentId: json['tournamentId'] as String,
      status: json['status'] as String,
    );
  }

  @override
  List<Object?> get props => [
    registrationId,
    registrationType,
    tournamentId,
    status,
  ];
}
