import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Represents a saved geographic zone with a name and radius for venue discovery.
final class SavedZone {
  const SavedZone({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusKm,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final int radiusKm;
  final DateTime updatedAt;

  String get nearParam => '$latitude,$longitude';

  SavedZone copyWith({
    String? id,
    String? name,
    double? latitude,
    double? longitude,
    int? radiusKm,
    DateTime? updatedAt,
  }) {
    return SavedZone(
      id: id ?? this.id,
      name: name ?? this.name,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      radiusKm: radiusKm ?? this.radiusKm,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'latitude': latitude,
        'longitude': longitude,
        'radiusKm': radiusKm,
        'updatedAt': updatedAt.toIso8601String(),
      };

  static SavedZone fromJson(Map<String, Object?> json) {
    return SavedZone(
      id: json['id'] as String,
      name: json['name'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radiusKm: (json['radiusKm'] as num).toInt(),
      updatedAt:
          DateTime.tryParse(json['updatedAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SavedZone &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Stores saved geographic zones (name + coords + radius) in secure storage.
final class SavedZonesRepository {
  SavedZonesRepository({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage;

  static const _key = 'user.saved_zones.v1';
  final FlutterSecureStorage _secureStorage;

  /// Returns all saved zones sorted by most recently updated.
  Future<List<SavedZone>> listZones() async {
    final raw = await _secureStorage.read(key: _key);
    if (raw == null || raw.trim().isEmpty) return const [];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return const [];

    return decoded
        .whereType<Map>()
        .map((m) => m.map((k, v) => MapEntry(k.toString(), v)))
        .map(SavedZone.fromJson)
        .toList()
      ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  /// Saves or updates a zone. If a zone with the same name (case-insensitive)
  /// already exists, updates it in place; otherwise inserts a new one.
  Future<void> saveZone({
    required String name,
    required double latitude,
    required double longitude,
    required int radiusKm,
  }) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;

    final list = await listZones();
    final idx =
        list.indexWhere((z) => z.name.toLowerCase() == trimmed.toLowerCase());
    final now = DateTime.now().toUtc();

    if (idx < 0) {
      list.insert(
        0,
        SavedZone(
          id: _stableId(trimmed),
          name: trimmed,
          latitude: latitude,
          longitude: longitude,
          radiusKm: radiusKm,
          updatedAt: now,
        ),
      );
    } else {
      list[idx] = list[idx].copyWith(
        latitude: latitude,
        longitude: longitude,
        radiusKm: radiusKm,
        updatedAt: now,
      );
    }

    await _write(list);
  }

  /// Deletes a zone by id.
  Future<void> deleteZone(String id) async {
    final list = await listZones();
    list.removeWhere((z) => z.id == id);
    await _write(list);
  }

  Future<void> _write(List<SavedZone> zones) async {
    final encoded = jsonEncode(zones.map((z) => z.toJson()).toList());
    await _secureStorage.write(key: _key, value: encoded);
  }

  String _stableId(String name) {
    final normalized =
        name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'^-|-$'), '');
    return 'zone_$normalized';
  }
}
