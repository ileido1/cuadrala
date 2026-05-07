import '../../../core/network/api_client.dart';
import '../../../core/network/api_json.dart';

abstract interface class TournamentsApi {
  Future<Map<String, Object?>> listTournamentFormatPresetsEnvelope({
    required String sportId,
  });

  Future<Map<String, Object?>> createTournamentEnvelope({
    required Map<String, Object?> body,
  });

  Future<Map<String, Object?>> getTournamentScheduleEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> generateTournamentScheduleEnvelope({
    required String tournamentId,
  });

  Future<Map<String, Object?>> getTournamentScoreboardEnvelope({
    required String tournamentId,
  });
}

final class DioTournamentsApi implements TournamentsApi {
  DioTournamentsApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listTournamentFormatPresetsEnvelope({
    required String sportId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/sports/$sportId/tournament-format-presets',
    );
  }

  @override
  Future<Map<String, Object?>> createTournamentEnvelope({
    required Map<String, Object?> body,
  }) async {
    final json = await _apiClient.postJson('/api/v1/tournaments', body: body);
    return decodeEnvelopeDataMap(json);
  }

  @override
  Future<Map<String, Object?>> getTournamentScheduleEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments/$tournamentId/schedule',
    );
  }

  @override
  Future<Map<String, Object?>> generateTournamentScheduleEnvelope({
    required String tournamentId,
  }) async {
    final json = await _apiClient.postJson(
      '/api/v1/tournaments/$tournamentId/schedule:generate',
    );
    return decodeEnvelopeDataMap(json);
  }

  @override
  Future<Map<String, Object?>> getTournamentScoreboardEnvelope({
    required String tournamentId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/tournaments/$tournamentId/scoreboard',
    );
  }
}

