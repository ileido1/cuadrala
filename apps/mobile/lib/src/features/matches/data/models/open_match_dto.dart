final class ParticipantPreviewDto {
  const ParticipantPreviewDto({
    required this.userId,
    required this.displayName,
  });

  final String userId;
  final String displayName;

  static ParticipantPreviewDto fromJson(Map<String, Object?> json) {
    return ParticipantPreviewDto(
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
    );
  }
}

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
    this.pricingCurrency,
    this.displayCurrency,
    this.participantPreview = const [],
    this.affectsElo = true,
    this.venueImageUrl,
    this.gender,
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
  final String? pricingCurrency;
  final String? displayCurrency;
  final List<ParticipantPreviewDto> participantPreview;
  final bool affectsElo;
  final String? venueImageUrl;
  final String? gender;

  static OpenMatchDto fromJson(Map<String, Object?> json) {
    final previewRaw = json['participantPreview'] as List<dynamic>? ?? [];
    final participantPreview = previewRaw
        .whereType<Map<String, Object?>>()
        .map(ParticipantPreviewDto.fromJson)
        .toList();

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
      pricingCurrency: json['pricingCurrency'] as String?,
      displayCurrency: json['displayCurrency'] as String?,
      participantPreview: participantPreview,
      affectsElo: json['affectsElo'] as bool? ?? true,
      venueImageUrl: json['venueImageUrl'] as String?,
      gender: json['gender'] as String?,
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
