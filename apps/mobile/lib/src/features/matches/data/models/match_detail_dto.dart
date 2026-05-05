final class MatchParticipantDto {
  const MatchParticipantDto({
    required this.userId,
    required this.joinedAt,
  });

  final String userId;
  final DateTime joinedAt;

  static MatchParticipantDto fromJson(Map<String, Object?> json) {
    final joinedAtRaw = json['joinedAt'] ?? json['createdAt'];
    return MatchParticipantDto(
      userId: json['userId'] as String,
      joinedAt: DateTime.parse(joinedAtRaw as String),
    );
  }
}

final class MatchDetailDto {
  const MatchDetailDto({
    required this.id,
    required this.sportId,
    required this.categoryId,
    required this.type,
    required this.status,
    required this.scheduledAt,
    required this.pricePerPlayerCents,
    required this.maxParticipants,
    required this.participantCount,
    required this.openSpots,
    required this.courtId,
    required this.clubName,
    required this.courtName,
    required this.locationLabel,
    required this.tournamentId,
    required this.participants,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String sportId;
  final String categoryId;
  final String type;
  final String status;
  final DateTime? scheduledAt;
  final int pricePerPlayerCents;
  final int maxParticipants;
  final int participantCount;
  final int openSpots;
  final String? courtId;
  final String? clubName;
  final String? courtName;
  final String? locationLabel;
  final String? tournamentId;
  final List<MatchParticipantDto> participants;
  final DateTime createdAt;
  final DateTime updatedAt;

  static MatchDetailDto fromJson(Map<String, Object?> json) {
    final participantsRaw = json['participants'];
    final participants = participantsRaw is List
        ? participantsRaw
            .whereType<Map<String, Object?>>()
            .map(MatchParticipantDto.fromJson)
            .toList()
        : <MatchParticipantDto>[];

    final maxParticipants = (json['maxParticipants'] as num).toInt();
    final participantCountRaw = json['participantCount'];
    final participantCount = participantCountRaw is num
        ? participantCountRaw.toInt()
        : participants.length;

    final openSpotsRaw = json['openSpots'];
    final openSpots = openSpotsRaw is num
        ? openSpotsRaw.toInt()
        : (maxParticipants - participantCount).clamp(0, maxParticipants);

    return MatchDetailDto(
      id: json['id'] as String,
      sportId: json['sportId'] as String,
      categoryId: json['categoryId'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      scheduledAt: json['scheduledAt'] == null
          ? null
          : DateTime.tryParse(json['scheduledAt'] as String),
      pricePerPlayerCents: (json['pricePerPlayerCents'] as num).toInt(),
      maxParticipants: maxParticipants,
      participantCount: participantCount,
      openSpots: openSpots,
      courtId: json['courtId'] as String?,
      clubName: json['clubName'] as String?,
      courtName: json['courtName'] as String?,
      locationLabel: json['locationLabel'] as String?,
      tournamentId: json['tournamentId'] as String?,
      participants: participants,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}
