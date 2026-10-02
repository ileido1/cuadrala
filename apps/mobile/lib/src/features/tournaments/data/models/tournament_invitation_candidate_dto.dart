final class TournamentInvitationCandidateDto {
  const TournamentInvitationCandidateDto({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;

  factory TournamentInvitationCandidateDto.fromJson(
    Map<String, Object?> json,
  ) => TournamentInvitationCandidateDto(
    id: json['id'] as String,
    name: json['name'] as String,
  );
}
