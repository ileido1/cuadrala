import '../../../core/network/api_client.dart';

abstract interface class MatchmakingApi {
  Future<Map<String, Object?>> listSuggestionsEnvelope({
    required String matchId,
    int? limit,
    double? radiusKm,
  });
}

final class DioMatchmakingApi implements MatchmakingApi {
  DioMatchmakingApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listSuggestionsEnvelope({
    required String matchId,
    int? limit,
    double? radiusKm,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/matchmaking/$matchId/suggestions',
      queryParameters: {
        if (limit != null) 'limit': limit,
        if (radiusKm != null) 'radiusKm': radiusKm,
      },
    );
  }
}
