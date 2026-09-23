final class QuickMatchProposalDto {
  const QuickMatchProposalDto({
    required this.id,
    required this.type,
    required this.status,
    required this.matchId,
    required this.expiresAt,
  });

  final String id;
  final String type;
  final String status;
  final String? matchId;
  final DateTime expiresAt;

  factory QuickMatchProposalDto.fromJson(Map<String, Object?> json) =>
      QuickMatchProposalDto(
        id: json['id'] as String,
        type: json['type'] as String,
        status: json['status'] as String,
        matchId: json['matchId'] as String?,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
}

final class QuickMatchSearchDto {
  const QuickMatchSearchDto({
    required this.id,
    required this.sportId,
    required this.categoryId,
    required this.status,
    required this.noMatchYet,
    required this.slots,
    required this.proposal,
  });

  final String id;
  final String sportId;
  final String categoryId;
  final String status;
  final bool noMatchYet;
  final List<String> slots;
  final QuickMatchProposalDto? proposal;

  factory QuickMatchSearchDto.fromJson(Map<String, Object?> json) =>
      QuickMatchSearchDto(
        id: json['id'] as String,
        sportId: json['sportId'] as String,
        categoryId: json['categoryId'] as String,
        status: json['status'] as String,
        noMatchYet: json['noMatchYet'] as bool? ?? false,
        slots: (json['slots'] as List? ?? const [])
            .whereType<String>()
            .toList(),
        proposal: json['proposal'] is Map<String, Object?>
            ? QuickMatchProposalDto.fromJson(
                json['proposal'] as Map<String, Object?>,
              )
            : null,
      );
}
