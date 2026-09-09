import 'package:equatable/equatable.dart';

abstract class FormatParameterFieldDef extends Equatable {
  final String key;
  final String type;
  final String label;
  final bool? required;

  const FormatParameterFieldDef({
    required this.key,
    required this.type,
    required this.label,
    this.required,
  });

  factory FormatParameterFieldDef.fromJson(Map<String, Object?> json) {
    final type = json['type'] as String?;
    switch (type) {
      case 'boolean':
        return BooleanFieldDef(
          key: json['key'] as String? ?? '',
          label: json['label'] as String? ?? '',
          required: json['required'] as bool?,
        );
      case 'int':
        return IntFieldDef(
          key: json['key'] as String? ?? '',
          label: json['label'] as String? ?? '',
          required: json['required'] as bool?,
          min: (json['min'] as num?)?.toInt(),
          max: (json['max'] as num?)?.toInt(),
        );
      case 'enum':
        final optionsJson = json['options'] as List<dynamic>? ?? [];
        final options = optionsJson
            .cast<Map<String, Object?>>()
            .map((o) => EnumOption(
                  value: o['value'] as String? ?? '',
                  label: o['label'] as String? ?? '',
                ))
            .toList();
        return EnumFieldDef(
          key: json['key'] as String? ?? '',
          label: json['label'] as String? ?? '',
          required: json['required'] as bool?,
          options: options,
        );
      default:
        throw ArgumentError('Unknown field type: $type');
    }
  }

  Map<String, Object?> toJson();
}

final class BooleanFieldDef extends FormatParameterFieldDef {
  const BooleanFieldDef({
    required String key,
    required String label,
    bool? required,
  }) : super(
    key: key,
    type: 'boolean',
    label: label,
    required: required,
  );

  @override
  Map<String, Object?> toJson() => {
    'key': key,
    'type': type,
    'label': label,
    if (required != null) 'required': required,
  };

  @override
  List<Object?> get props => [key, type, label, required];
}

final class IntFieldDef extends FormatParameterFieldDef {
  final int? min;
  final int? max;

  const IntFieldDef({
    required String key,
    required String label,
    bool? required,
    this.min,
    this.max,
  }) : super(
    key: key,
    type: 'int',
    label: label,
    required: required,
  );

  @override
  Map<String, Object?> toJson() => {
    'key': key,
    'type': type,
    'label': label,
    if (required != null) 'required': required,
    if (min != null) 'min': min,
    if (max != null) 'max': max,
  };

  @override
  List<Object?> get props => [key, type, label, required, min, max];
}

final class EnumOption extends Equatable {
  final String value;
  final String label;

  const EnumOption({required this.value, required this.label});

  @override
  List<Object?> get props => [value, label];
}

final class EnumFieldDef extends FormatParameterFieldDef {
  final List<EnumOption> options;

  const EnumFieldDef({
    required String key,
    required String label,
    bool? required,
    required this.options,
  }) : super(
    key: key,
    type: 'enum',
    label: label,
    required: required,
  );

  @override
  Map<String, Object?> toJson() => {
    'key': key,
    'type': type,
    'label': label,
    if (required != null) 'required': required,
    'options': options.map((o) => {'value': o.value, 'label': o.label}).toList(),
  };

  @override
  List<Object?> get props => [key, type, label, required, options];
}
