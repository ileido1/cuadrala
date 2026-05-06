final class UserStatsDto {
  const UserStatsDto({
    required this.userId,
    required this.matchesPlayed,
    required this.matchesWon,
    required this.matchesLost,
    required this.winRate,
  });

  final String userId;
  final int matchesPlayed;
  final int matchesWon;
  final int matchesLost;
  final double winRate;

  static UserStatsDto fromJson(Map<String, Object?> json) {
    final played = (json['matchesPlayed'] as num?)?.toInt() ??
        (json['gamesPlayed'] as num?)?.toInt() ??
        0;
    final won = (json['matchesWon'] as num?)?.toInt() ?? 0;
    final lost = (json['matchesLost'] as num?)?.toInt() ?? 0;
    final winRate = json['winRate'] is num
        ? (json['winRate'] as num).toDouble()
        : (played == 0 ? 0.0 : won / played);
    return UserStatsDto(
      userId: (json['userId'] as String?) ?? '',
      matchesPlayed: played,
      matchesWon: won,
      matchesLost: lost,
      winRate: winRate,
    );
  }
}

