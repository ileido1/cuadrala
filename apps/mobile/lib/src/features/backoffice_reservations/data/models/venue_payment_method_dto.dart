import '../../../../core/models/currency_code.dart';

final class VenuePaymentMethodDto {
  const VenuePaymentMethodDto({
    required this.id,
    required this.type,
    required this.name,
    this.settlementCurrency,
    this.isActive = true,
  });

  final String id;
  final String type;
  final String name;
  final String? settlementCurrency;
  final bool isActive;

  CurrencyCode get settlementCurrencyCode => CurrencyCode.resolve(
        pricingCurrency: settlementCurrency,
      );

  static VenuePaymentMethodDto fromJson(Map<String, Object?> json) {
    return VenuePaymentMethodDto(
      id: json['id'] as String,
      type: json['type'] as String,
      name: json['name'] as String,
      settlementCurrency: json['settlementCurrency'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }
}

List<VenuePaymentMethodDto> parseVenuePaymentMethods(Object? data) {
  if (data is List) {
    return data
        .whereType<Map<String, Object?>>()
        .map(VenuePaymentMethodDto.fromJson)
        .where((m) => m.isActive)
        .toList();
  }
  if (data is Map<String, Object?> && data['items'] is List) {
    return parseVenuePaymentMethods(data['items']);
  }
  return [];
}
