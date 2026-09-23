final class QuickMatchSearchDto {
  const QuickMatchSearchDto({
    required this.id,
    required this.status,
    required this.noMatchYet,
  });
  final String id;
  final String status;
  final bool noMatchYet;
  factory QuickMatchSearchDto.fromJson(Map<String, Object?> json) =>
      QuickMatchSearchDto(
        id: json['id'] as String,
        status: json['status'] as String,
        noMatchYet: json['noMatchYet'] as bool? ?? false,
      );
}
