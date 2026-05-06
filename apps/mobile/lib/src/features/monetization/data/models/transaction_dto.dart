final class TransactionDto {
  const TransactionDto({
    required this.id,
    required this.matchId,
    required this.userId,
    required this.amountBase,
    required this.feeAmount,
    required this.amountTotal,
    required this.status,
    required this.paymentMethod,
    required this.confirmedAt,
    required this.createdAt,
  });

  final String id;
  final String matchId;
  final String userId;
  final String amountBase;
  final String feeAmount;
  final String amountTotal;
  final String status; // PENDING | CONFIRMED | CANCELLED
  final String paymentMethod;
  final DateTime? confirmedAt;
  final DateTime createdAt;

  static TransactionDto fromJson(Map<String, Object?> json) {
    final confirmedAtRaw = json['confirmedAt'];
    return TransactionDto(
      id: json['id'] as String,
      matchId: json['matchId'] as String,
      userId: json['userId'] as String,
      amountBase: json['amountBase'] as String,
      feeAmount: json['feeAmount'] as String,
      amountTotal: json['amountTotal'] as String,
      status: json['status'] as String,
      paymentMethod: (json['paymentMethod'] as String?) ?? 'MANUAL',
      confirmedAt: confirmedAtRaw == null
          ? null
          : DateTime.tryParse(confirmedAtRaw as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

