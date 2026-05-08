import '../../../core/failures/app_failure.dart';
import 'matchmaking_api.dart';
import 'models/matchmaking_suggestion_dto.dart';

final class MatchmakingRepository {
  MatchmakingRepository({required MatchmakingApi api}) : _api = api;

  final MatchmakingApi _api;

  Future<List<MatchmakingSuggestionDto>> listSuggestions({
    required String matchId,
    int limit = 20,
  }) async {
    final data = await _api.listSuggestionsEnvelope(matchId: matchId, limit: limit);
    final suggestionsRaw = data['suggestions'];
    if (suggestionsRaw is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return suggestionsRaw
        .whereType<Map<String, Object?>>()
        .map(MatchmakingSuggestionDto.fromJson)
        .toList();
  }
}
