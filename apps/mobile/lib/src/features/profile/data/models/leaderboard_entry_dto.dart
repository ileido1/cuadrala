final class LeaderboardEntryDto {
  const LeaderboardEntryDto({
    required this.rank,
    required this.userId,
    required this.displayName,
    required this.rating,
    this.points = 0,
  });

  final int rank;
  final String userId;
  final String displayName;
  final double rating;
  final int points;

  static LeaderboardEntryDto fromJson(Map<String, Object?> json) {
    return LeaderboardEntryDto(
      rank: (json['rank'] as num).toInt(),
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      rating: (json['rating'] as num).toDouble(),
      points: (json['points'] as num?)?.toInt() ?? 0,
    );
  }
}
