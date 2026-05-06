final class UserLocationDto {
  const UserLocationDto({
    required this.label,
    required this.latitude,
    required this.longitude,
    required this.radiusKm,
  });

  final String? label;
  final double latitude;
  final double longitude;
  final int radiusKm;

  static UserLocationDto fromJson(Map<String, Object?> json) {
    return UserLocationDto(
      label: json['label'] as String?,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radiusKm: (json['radiusKm'] as num).toInt(),
    );
  }
}
