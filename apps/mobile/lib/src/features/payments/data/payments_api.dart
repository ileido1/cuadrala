import '../../../core/network/api_client.dart';

abstract class PaymentsApi {
  Future<Map<String, Object?>> getPendingTransactionsEnvelope({
    required String venueId,
    String? from,
    String? to,
    String? matchId,
  });
}

final class DioPaymentsApi implements PaymentsApi {
  DioPaymentsApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> getPendingTransactionsEnvelope({
    required String venueId,
    String? from,
    String? to,
    String? matchId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/transactions/pending',
      queryParameters: {
        if (from != null) 'from': from,
        if (to != null) 'to': to,
        if (matchId != null) 'matchId': matchId,
      },
    );
  }
}