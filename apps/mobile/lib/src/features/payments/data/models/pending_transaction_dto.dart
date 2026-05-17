/// Transacción pendiente del staff (GET /venues/:id/transactions/pending).
final class PendingTransactionDto {
  const PendingTransactionDto({
    required this.id,
    required this.amountTotalMajor,
    required this.status,
    required this.createdAt,
    this.matchId,
    this.reservationId,
    this.userId,
  });

  final String id;
  final String? matchId;
  final String? reservationId;
  final String? userId;
  /// Monto total en unidades mayores (legacy `amountTotal`).
  final double amountTotalMajor;
  final String status;
  final DateTime createdAt;

  String displayLabel({String? courtHint}) {
    if (courtHint != null && courtHint.isNotEmpty) {
      return courtHint;
    }
    if (matchId != null) {
      return 'Partido · ${matchId!.substring(0, 8)}';
    }
    if (reservationId != null) {
      return 'Reserva · ${reservationId!.substring(0, 8)}';
    }
    return 'Pago pendiente';
  }

  static PendingTransactionDto fromJson(Map<String, Object?> json) {
    final AMOUNT_RAW = json['amountTotal'];
    final AMOUNT = AMOUNT_RAW is String
        ? double.tryParse(AMOUNT_RAW)
        : (AMOUNT_RAW as num?)?.toDouble();

    return PendingTransactionDto(
      id: json['id'] as String,
      matchId: json['matchId'] as String?,
      reservationId: json['reservationId'] as String?,
      userId: json['userId'] as String?,
      amountTotalMajor: AMOUNT ?? 0,
      status: (json['status'] as String?) ?? 'PENDING',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
