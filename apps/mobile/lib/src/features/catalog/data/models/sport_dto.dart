final class SportDto {
  const SportDto({
    required this.id,
    required this.code,
    required this.name,
  });

  final String id;
  final String code;
  final String name;

  static SportDto fromJson(Map<String, Object?> json) {
    return SportDto(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
    );
  }
}
