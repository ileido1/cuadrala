final class VenueDto {
  const VenueDto({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.pricingCurrency,
    this.displayCurrency,
  });

  final String id;
  final String name;
  final String? address;
  final double? latitude;
  final double? longitude;
  final String? pricingCurrency;
  final String? displayCurrency;

  static VenueDto fromJson(Map<String, Object?> json) {
    final latRaw = json['latitude'];
    final lngRaw = json['longitude'];
    return VenueDto(
      id: json['id'] as String,
      name: json['name'] as String,
      address: json['address'] as String?,
      latitude: latRaw is num ? latRaw.toDouble() : null,
      longitude: lngRaw is num ? lngRaw.toDouble() : null,
      pricingCurrency: json['pricingCurrency'] as String?,
      displayCurrency: json['displayCurrency'] as String?,
    );
  }
}

