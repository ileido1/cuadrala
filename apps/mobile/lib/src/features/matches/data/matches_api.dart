import '../../../core/network/api_client.dart';

abstract interface class MatchesApi {
  Future<Map<String, Object?>> listOpenMatchesEnvelope({
    required String sportId,
    int page,
    int limit,
    String? categoryId,
  });

  Future<Map<String, Object?>> getMatchEnvelope({required String matchId});

  Future<Map<String, Object?>> createMatchEnvelope({
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> joinMatchEnvelope({required String matchId});

  Future<void> leaveMatch({required String matchId});

  Future<Map<String, Object?>> cancelMatchEnvelope({required String matchId});

  Future<void> startMatch({required String matchId});

  Future<void> finishMatch({required String matchId});

  Future<Map<String, Object?>> upsertResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> confirmResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> reproposeResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  });
}

final class DioMatchesApi implements MatchesApi {
  const DioMatchesApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listOpenMatchesEnvelope({
    required String sportId,
    int page = 1,
    int limit = 20,
    String? categoryId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/matches/open',
      queryParameters: {
        'sportId': sportId,
        'page': page,
        'limit': limit,
        if (categoryId != null) 'categoryId': categoryId,
      },
    );
  }

  @override
  Future<Map<String, Object?>> getMatchEnvelope({required String matchId}) {
    return _apiClient.getEnvelopeDataMap('/api/v1/matches/$matchId');
  }

  @override
  Future<Map<String, Object?>> createMatchEnvelope({
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/matches', body: body);
  }

  @override
  Future<Map<String, Object?>> joinMatchEnvelope({required String matchId}) {
    return _apiClient.postJson('/api/v1/matches/$matchId/join');
  }

  @override
  Future<void> leaveMatch({required String matchId}) {
    return _apiClient.postNoContent('/api/v1/matches/$matchId/leave');
  }

  @override
  Future<Map<String, Object?>> cancelMatchEnvelope({required String matchId}) {
    return _apiClient.patchJson('/api/v1/matches/$matchId/cancel');
  }

  @override
  Future<void> startMatch({required String matchId}) {
    return _apiClient.postNoContent('/api/v1/matches/$matchId/start');
  }

  @override
  Future<void> finishMatch({required String matchId}) {
    return _apiClient.postNoContent('/api/v1/matches/$matchId/finish');
  }

  @override
  Future<Map<String, Object?>> upsertResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.putJson('/api/v1/matches/$matchId/result-draft', body: body);
  }

  @override
  Future<Map<String, Object?>> confirmResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/matches/$matchId/result-draft/confirm', body: body);
  }

  @override
  Future<Map<String, Object?>> reproposeResultDraftEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/matches/$matchId/result-draft/reproposal', body: body);
  }
}
