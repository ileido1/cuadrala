final class TournamentRegistrationDto {
  const TournamentRegistrationDto({
    required this.id,
    required this.tournamentId,
    required this.userId,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String tournamentId;
  final String userId;
  final String status;
  final DateTime createdAt;

  static TournamentRegistrationDto fromJson(Map<String, Object?> json) {
    return TournamentRegistrationDto(
      id: json['id'] as String,
      tournamentId: json['tournamentId'] as String,
      userId: json['userId'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
