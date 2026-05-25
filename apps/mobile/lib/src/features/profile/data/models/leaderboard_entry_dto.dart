final class LeaderboardEntryDto {
  const LeaderboardEntryDto({
    required this.rank,
    required this.userId,
    required this.displayName,
    required this.rating,
  });

  final int rank;
  final String userId;
  final String displayName;
  final double rating;

  static LeaderboardEntryDto fromJson(Map<String, Object?> json) {
    return LeaderboardEntryDto(
      rank: (json['rank'] as num).toInt(),
      userId: json['userId'] as String,
      displayName: json['displayName'] as String,
      rating: (json['rating'] as num).toDouble(),
    );
  }
}
