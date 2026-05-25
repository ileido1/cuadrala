import '../../../../core/venue/court_pricing.dart';

final class CourtDto {
  const CourtDto({
    required this.id,
    required this.venueId,
    required this.name,
    required this.sportType,
    required this.indoor,
    required this.lighting,
    this.surfaceType,
    required this.status,
    required this.createdAt,
    required this.pricePerHourCents,
    required this.durationMinutes,
    this.pricingTiers = const [],
  });

  final String id;
  final String venueId;
  final String name;
  final String sportType;
  final bool indoor;
  final bool lighting;
  final String? surfaceType;
  final String status;
  final DateTime createdAt;
  final int pricePerHourCents;
  final int durationMinutes;
  final List<CourtPricingTierDto> pricingTiers;

  static CourtDto fromJson(Map<String, Object?> json) {
    return CourtDto(
      id: json['id'] as String,
      venueId: json['venueId'] as String,
      name: json['name'] as String,
      sportType: (json['sportType'] as String?) ?? 'PADEL',
      indoor: (json['indoor'] as bool?) ?? false,
      lighting: (json['lighting'] as bool?) ?? false,
      surfaceType: json['surfaceType'] as String?,
      status: (json['status'] as String?) ?? 'ACTIVE',
      createdAt: DateTime.parse(json['createdAt'] as String),
      pricePerHourCents: (json['pricePerHourCents'] as num?)?.toInt() ?? 0,
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 60,
      pricingTiers: _parsePricingTiers(json['pricingTiers']),
    );
  }

  static List<CourtPricingTierDto> _parsePricingTiers(Object? raw) {
    if (raw is! List) return const [];
    return raw
        .map(CourtPricingTierDto.fromJson)
        .whereType<CourtPricingTierDto>()
        .toList(growable: false);
  }
}

