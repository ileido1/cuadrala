import '../../../core/network/api_client.dart';

abstract interface class ProfileApi {
  Future<Map<String, Object?>> getMeEnvelope();
  Future<Map<String, Object?>> getPlayerProfileEnvelope();
  Future<Map<String, Object?>> patchMeEnvelope({required Map<String, Object?> body});
  Future<Map<String, Object?>> getUserStatsEnvelope({required String userId});
  Future<Map<String, Object?>> getUserRatingsEnvelope({
    required String userId,
    String? categoryId,
  });
  Future<Map<String, Object?>> getUserRatingHistoryEnvelope({
    required String userId,
    String? categoryId,
    int? page,
    int? limit,
  });
  Future<Map<String, Object?>> getRatingsLeaderboardEnvelope({
    required String categoryId,
    int? limit,
  });
}

final class DioProfileApi implements ProfileApi {
  const DioProfileApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> getMeEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me');
  }

  @override
  Future<Map<String, Object?>> getPlayerProfileEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me/profile');
  }

  @override
  Future<Map<String, Object?>> patchMeEnvelope({required Map<String, Object?> body}) {
    return _apiClient.patchJson('/api/v1/users/me', body: body);
  }

  @override
  Future<Map<String, Object?>> getUserStatsEnvelope({required String userId}) {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/$userId/stats');
  }

  @override
  Future<Map<String, Object?>> getUserRatingsEnvelope({
    required String userId,
    String? categoryId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/users/$userId/ratings',
      queryParameters: {
        'categoryId': ?categoryId,
      },
    );
  }

  @override
  Future<Map<String, Object?>> getUserRatingHistoryEnvelope({
    required String userId,
    String? categoryId,
    int? page,
    int? limit,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/users/$userId/ratings/history',
      queryParameters: {
        'categoryId': ?categoryId,
        'page': ?page,
        'limit': ?limit,
      },
    );
  }

  @override
  Future<Map<String, Object?>> getRatingsLeaderboardEnvelope({
    required String categoryId,
    int? limit,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/ratings/leaderboard',
      queryParameters: {
        'categoryId': categoryId,
        'limit': ?limit,
      },
    );
  }
}
