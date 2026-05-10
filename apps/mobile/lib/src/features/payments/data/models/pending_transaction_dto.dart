class PlayerSummaryDto {
  const PlayerSummaryDto({required this.id, required this.name});

  final String id;
  final String name;

  static PlayerSummaryDto fromJson(Map<String, Object?> json) {
    return PlayerSummaryDto(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

class PendingTransactionDto {
  const PendingTransactionDto({
    required this.id,
    required this.matchId,
    required this.matchLabel,
    required this.amountCents,
    required this.currency,
    required this.player,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String matchId;
  final String matchLabel;
  final int amountCents;
  final String currency;
  final PlayerSummaryDto player;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  static PendingTransactionDto fromJson(Map<String, Object?> json) {
    return PendingTransactionDto(
      id: json['id'] as String,
      matchId: json['matchId'] as String,
      matchLabel: json['matchLabel'] as String,
      amountCents: (json['amount'] as num).toInt(),
      currency: json['currency'] as String,
      player: PlayerSummaryDto.fromJson(json['player'] as Map<String, Object?>),
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}