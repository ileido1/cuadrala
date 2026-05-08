final class MatchmakingSuggestionDto {
  const MatchmakingSuggestionDto({
    required this.userId,
    required this.name,
    required this.source,
    this.points,
    this.rating,
  });

  final String userId;
  final String name;
  final String source;
  final num? points;
  final num? rating;

  static MatchmakingSuggestionDto fromJson(Map<String, Object?> json) {
    return MatchmakingSuggestionDto(
      userId: json['userId'] as String,
      name: json['name'] as String,
      source: json['source'] as String,
      points: json['points'] as num?,
      rating: json['rating'] as num?,
    );
  }

  String get displayMetric {
    if (rating != null) return 'Elo: ${rating!.toInt()}';
    if (points != null) return 'Pts: ${points!.toInt()}';
    return '';
  }
}
