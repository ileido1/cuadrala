import '../../../../core/venue/opening_hours.dart';

final class VenueDto {
  const VenueDto({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.pricingCurrency,
    this.displayCurrency,
    this.openingHours,
    this.timezone,
    this.countryCode,
    this.imageUrl,
    this.distanceKm,
    this.phone,
    this.description,
    this.averageRating,
    this.sports = const [],
  });

  final String id;
  final String name;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String? pricingCurrency;
  final String? displayCurrency;
  final OpeningHoursMap? openingHours;
  final String? timezone;
  final String? countryCode;
  final String? imageUrl;
  final double? distanceKm;
  final String? phone;
  final String? description;
  final double? averageRating;
  final List<String> sports;

  static VenueDto fromJson(Map<String, Object?> json) {
    final latRaw = json['latitude'];
    final lngRaw = json['longitude'];
    final distRaw = json['distanceKm'];
    final ratingRaw = json['averageRating'];
    final sportsRaw = json['sports'];
    return VenueDto(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      latitude: latRaw is num ? latRaw.toDouble() : null,
      longitude: lngRaw is num ? lngRaw.toDouble() : null,
      pricingCurrency: json['pricingCurrency'] as String?,
      displayCurrency: json['displayCurrency'] as String?,
      openingHours: openingHoursFromJson(json['openingHours']),
      timezone: json['timezone'] as String?,
      countryCode: json['countryCode'] as String?,
      imageUrl: json['imageUrl'] as String?,
      distanceKm: distRaw is num ? distRaw.toDouble() : null,
      phone: json['phone'] as String?,
      description: json['description'] as String?,
      averageRating: ratingRaw is num ? ratingRaw.toDouble() : null,
      sports: sportsRaw is List
          ? sportsRaw.whereType<String>().toList(growable: false)
          : const [],
    );
  }
}

