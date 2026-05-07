final class CourtDto {
  const CourtDto({
    required this.id,
    required this.venueId,
    required this.name,
  });

  final String id;
  final String venueId;
  final String name;

  static CourtDto fromJson(Map<String, Object?> json) {
    return CourtDto(
      id: json['id'] as String,
      venueId: json['venueId'] as String,
      name: json['name'] as String,
    );
  }
}

