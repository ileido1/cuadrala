import '../../../core/failures/app_failure.dart';
import 'models/pending_transaction_dto.dart';
import 'payments_api.dart';

class PaymentsRepository {
  PaymentsRepository({required PaymentsApi paymentsApi}) : _paymentsApi = paymentsApi;

  final PaymentsApi _paymentsApi;

  Future<List<PendingTransactionDto>> getPendingTransactions({
    required String venueId,
    DateTime? from,
    DateTime? to,
    String? matchId,
  }) async {
    final data = await _paymentsApi.getPendingTransactionsEnvelope(
      venueId: venueId,
      from: from?.toIso8601String(),
      to: to?.toIso8601String(),
      matchId: matchId,
    );

    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    return itemsRaw
        .whereType<Map<String, Object?>>()
        .map(PendingTransactionDto.fromJson)
        .toList();
  }
}