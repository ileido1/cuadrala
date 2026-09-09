import 'package:equatable/equatable.dart';
import 'format_parameter_field_def.dart';

final class TournamentPresetDto extends Equatable {
  const TournamentPresetDto({
    required this.id,
    required this.sportId,
    required this.code,
    required this.version,
    required this.name,
    required this.schemaVersion,
    required this.defaultParameters,
    this.parametersSchema,
  });

  final String id;
  final String sportId;
  final String code;
  final int version;
  final String name;
  final int schemaVersion;
  final Object? defaultParameters;
  final List<FormatParameterFieldDef>? parametersSchema;

  factory TournamentPresetDto.fromJson(Map<String, Object?> json) {
    final schemaJson = json['parametersSchema'] as List<dynamic>?;
    final schema = schemaJson
        ?.cast<Map<String, Object?>>()
        .map((s) => FormatParameterFieldDef.fromJson(s))
        .toList();

    return TournamentPresetDto(
      id: (json['id'] ?? '').toString(),
      sportId: (json['sportId'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      version: (json['version'] as num?)?.toInt() ?? 0,
      name: (json['name'] ?? '').toString(),
      schemaVersion: (json['schemaVersion'] as num?)?.toInt() ?? 0,
      defaultParameters: json['defaultParameters'],
      parametersSchema: schema,
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
        if (parametersSchema != null)
          'parametersSchema':
              parametersSchema!.map((s) => s.toJson()).toList(),
      };

  @override
  List<Object?> get props => [
    id,
    sportId,
    code,
    version,
    name,
    schemaVersion,
    defaultParameters,
    parametersSchema,
  ];
}

