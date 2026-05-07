final class OpenMatchDto {
  const OpenMatchDto({
    required this.id,
    required this.sportId,
    required this.categoryId,
    this.categoryName,
    required this.status,
    required this.scheduledAt,
    required this.pricePerPlayerCents,
    required this.maxParticipants,
    required this.participantCount,
    required this.openSpots,
    required this.clubName,
    required this.courtName,
    required this.locationLabel,
  });

  final String id;
  final String sportId;
  final String categoryId;
  final String? categoryName;
  final String status;
  final DateTime? scheduledAt;
  final int pricePerPlayerCents;
  final int maxParticipants;
  final int participantCount;
  final int openSpots;
  final String? clubName;
  final String? courtName;
  final String? locationLabel;

  static OpenMatchDto fromJson(Map<String, Object?> json) {
    return OpenMatchDto(
      id: json['id'] as String,
      sportId: json['sportId'] as String,
      categoryId: json['categoryId'] as String,
      categoryName: json['categoryName'] as String?,
      status: json['status'] as String,
      scheduledAt: _parseDate(json['scheduledAt']),
      pricePerPlayerCents: (json['pricePerPlayerCents'] as num).toInt(),
      maxParticipants: (json['maxParticipants'] as num).toInt(),
      participantCount: (json['participantCount'] as num).toInt(),
      openSpots: (json['openSpots'] as num).toInt(),
      clubName: json['clubName'] as String?,
      courtName: json['courtName'] as String?,
      locationLabel: json['locationLabel'] as String?,
    );
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }
}

final class OpenMatchesPage {
  const OpenMatchesPage({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
  });

  final List<OpenMatchDto> items;
  final int page;
  final int limit;
  final int total;
}
