final class NotificationSubscriptionDto {
  const NotificationSubscriptionDto({
    required this.id,
    required this.userId,
    this.categoryId,
    this.nearLat,
    this.nearLng,
    this.radiusKm,
    required this.enabled,
    this.enabledTypes,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String? categoryId;
  final double? nearLat;
  final double? nearLng;
  final double? radiusKm;
  final bool enabled;
  final Map<String, bool>? enabledTypes;
  final DateTime createdAt;
  final DateTime updatedAt;

  static NotificationSubscriptionDto fromJson(Map<String, Object?> json) {
    final rawTypes = json['enabledTypes'];
    Map<String, bool>? enabledTypes;
    if (rawTypes is Map<String, Object?>) {
      enabledTypes = <String, bool>{};
      for (final entry in rawTypes.entries) {
        if (entry.value is bool) {
          enabledTypes[entry.key] = entry.value as bool;
        }
      }
    }

    num? parseNum(dynamic v) {
      if (v == null) return null;
      if (v is num) return v;
      return null;
    }

    return NotificationSubscriptionDto(
      id: json['id'] as String,
      userId: json['userId'] as String,
      categoryId: json['categoryId'] as String?,
      nearLat: parseNum(json['nearLat'])?.toDouble(),
      nearLng: parseNum(json['nearLng'])?.toDouble(),
      radiusKm: parseNum(json['radiusKm'])?.toDouble(),
      enabled: json['enabled'] as bool,
      enabledTypes: enabledTypes,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}
