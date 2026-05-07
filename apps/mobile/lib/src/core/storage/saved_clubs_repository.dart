import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final class SavedClub {
  const SavedClub({
    required this.id,
    required this.clubName,
    required this.courts,
    required this.updatedAt,
  });

  final String id;
  final String clubName;
  final List<String> courts;
  final DateTime updatedAt;

  Map<String, Object?> toJson() => {
        'id': id,
        'clubName': clubName,
        'courts': courts,
        'updatedAt': updatedAt.toIso8601String(),
      };

  static SavedClub fromJson(Map<String, Object?> json) {
    final courtsRaw = json['courts'];
    return SavedClub(
      id: json['id'] as String,
      clubName: json['clubName'] as String,
      courts: courtsRaw is List ? courtsRaw.whereType<String>().toList() : const <String>[],
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

final class SavedClubsRepository {
  SavedClubsRepository({required FlutterSecureStorage secureStorage})
      : _secureStorage = secureStorage;

  static const _key = 'user.saved_clubs.v1';

  final FlutterSecureStorage _secureStorage;

  Future<List<SavedClub>> listClubs() async {
    final raw = await _secureStorage.read(key: _key);
    if (raw == null || raw.trim().isEmpty) return const <SavedClub>[];

    final decoded = jsonDecode(raw);
    if (decoded is! List) return const <SavedClub>[];

    final items = decoded
        .whereType<Map>()
        .map((m) => m.map((k, v) => MapEntry(k.toString(), v)) as Map<String, Object?>)
        .map(SavedClub.fromJson)
        .toList();

    items.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return items;
  }

  Future<void> upsertClub({
    required String clubName,
    String? courtName,
  }) async {
    final name = clubName.trim();
    final court = courtName?.trim();
    if (name.isEmpty) return;

    final list = await listClubs();
    final idx = list.indexWhere((c) => c.clubName.toLowerCase() == name.toLowerCase());
    final now = DateTime.now().toUtc();

    if (idx < 0) {
      final id = _stableId(name);
      list.insert(
        0,
        SavedClub(
          id: id,
          clubName: name,
          courts: (court == null || court.isEmpty) ? const <String>[] : <String>[court],
          updatedAt: now,
        ),
      );
    } else {
      final existing = list[idx];
      final courts = [...existing.courts];
      if (court != null && court.isNotEmpty) {
        final exists = courts.any((c) => c.toLowerCase() == court.toLowerCase());
        if (!exists) courts.insert(0, court);
      }
      final updated = SavedClub(
        id: existing.id,
        clubName: existing.clubName,
        courts: courts,
        updatedAt: now,
      );
      list.removeAt(idx);
      list.insert(0, updated);
    }

    final encoded = jsonEncode(list.map((e) => e.toJson()).toList());
    await _secureStorage.write(key: _key, value: encoded);
  }

  String _stableId(String name) {
    final normalized = name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'-+'), '-');
    return 'club_$normalized';
  }
}

