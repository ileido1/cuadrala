import 'package:equatable/equatable.dart';

final class TournamentPresetDto extends Equatable {
  const TournamentPresetDto({
    required this.id,
    required this.sportId,
    required this.code,
    required this.version,
    required this.name,
    required this.schemaVersion,
    required this.defaultParameters,
  });

  final String id;
  final String sportId;
  final String code;
  final int version;
  final String name;
  final int schemaVersion;
  final Object? defaultParameters;

  factory TournamentPresetDto.fromJson(Map<String, Object?> json) {
    return TournamentPresetDto(
      id: (json['id'] ?? '').toString(),
      sportId: (json['sportId'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      version: (json['version'] as num?)?.toInt() ?? 0,
      name: (json['name'] ?? '').toString(),
      schemaVersion: (json['schemaVersion'] as num?)?.toInt() ?? 0,
      defaultParameters: json['defaultParameters'],
    );
  }

  Map<String, Object?> toJson() => {
        'id': id,
        'sportId': sportId,
        'code': code,
        'version': version,
        'name': name,
        'schemaVersion': schemaVersion,
        'defaultParameters': defaultParameters,
      };

  @override
  List<Object?> get props => [id, sportId, code, version, name, schemaVersion, defaultParameters];
}

