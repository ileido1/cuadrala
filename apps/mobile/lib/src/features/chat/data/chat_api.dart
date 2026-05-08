import '../../../core/network/api_client.dart';

abstract interface class ChatApi {
  Future<Map<String, Object?>> listMatchChatMessagesEnvelope({
    required String matchId,
    int? limit,
    String? cursorCreatedAt,
  });

  Future<Map<String, Object?>> postMatchChatMessageEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> listTournamentChatMessagesEnvelope({
    required String tournamentId,
    int? limit,
    String? cursorCreatedAt,
  });

  Future<Map<String, Object?>> postTournamentChatMessageEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  });
}

final class DioChatApi implements ChatApi {
  DioChatApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listMatchChatMessagesEnvelope({
    required String matchId,
    int? limit,
    String? cursorCreatedAt,
  }) {
    return _apiClient.getJson(
      '/api/v1/matches/$matchId/chat/messages',
      queryParameters: {
        if (limit != null) 'limit': limit,
        if (cursorCreatedAt != null) 'cursorCreatedAt': cursorCreatedAt,
      },
    );
  }

  @override
  Future<Map<String, Object?>> postMatchChatMessageEnvelope({
    required String matchId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/matches/$matchId/chat/messages', body: body);
  }

  @override
  Future<Map<String, Object?>> listTournamentChatMessagesEnvelope({
    required String tournamentId,
    int? limit,
    String? cursorCreatedAt,
  }) {
    return _apiClient.getJson(
      '/api/v1/tournaments/$tournamentId/chat/messages',
      queryParameters: {
        if (limit != null) 'limit': limit,
        if (cursorCreatedAt != null) 'cursorCreatedAt': cursorCreatedAt,
      },
    );
  }

  @override
  Future<Map<String, Object?>> postTournamentChatMessageEnvelope({
    required String tournamentId,
    required Map<String, Object?> body,
  }) {
    return _apiClient.postJson('/api/v1/tournaments/$tournamentId/chat/messages', body: body);
  }
}

