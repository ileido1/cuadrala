import '../../../core/failures/app_failure.dart';
import 'models/leaderboard_entry_dto.dart';
import 'models/player_profile_dto.dart';
import 'models/user_me_dto.dart';
import 'models/user_rating_dto.dart';
import 'models/user_stats_dto.dart';
import 'profile_api.dart';

class ProfileRepository {
  ProfileRepository({required ProfileApi profileApi}) : _profileApi = profileApi;

  final ProfileApi _profileApi;

  Future<UserMeDto> getMe() async {
    final data = await _profileApi.getMeEnvelope();
    final userRaw = data['user'];
    if (userRaw is! Map<String, Object?>) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    return UserMeDto.fromJson(userRaw);
  }

  Future<void> patchMyName(String name) async {
    await _profileApi.patchMeEnvelope(body: {'name': name});
  }

  Future<PlayerProfileDto> getPlayerProfile() async {
    final data = await _profileApi.getPlayerProfileEnvelope();
    final raw = data['profile'];
    if (raw is Map<String, Object?>) {
      return PlayerProfileDto.fromJson(raw);
    }
    if (data['dominantHand'] is String) {
      return PlayerProfileDto.fromJson(data);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<UserStatsDto> getUserStats(String userId) async {
    final data = await _profileApi.getUserStatsEnvelope(userId: userId);
    final raw = data['stats'] ?? data['item'] ?? data['data'];
    if (raw is Map<String, Object?>) return UserStatsDto.fromJson(raw);
    // envelope típico: `data` ya es el DTO
    if (data['userId'] is String) return UserStatsDto.fromJson(data);
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<List<UserRatingDto>> getUserRatings({
    required String userId,
    String? categoryId,
  }) async {
    final data = await _profileApi.getUserRatingsEnvelope(
      userId: userId,
      categoryId: categoryId,
    );
    final raw = data['items'] ?? (data['data'] is Map ? (data['data'] as Map)['items'] : null);
    if (raw is List) {
      return raw.whereType<Map<String, Object?>>().map(UserRatingDto.fromJson).toList();
    }
    final dataRaw = data['data'];
    if (dataRaw is Map<String, Object?> && dataRaw['items'] is List) {
      return (dataRaw['items'] as List)
          .whereType<Map<String, Object?>>()
          .map(UserRatingDto.fromJson)
          .toList();
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<List<UserRatingHistoryItemDto>> getUserRatingHistory({
    required String userId,
    String? categoryId,
    int page = 1,
    int limit = 20,
  }) async {
    final data = await _profileApi.getUserRatingHistoryEnvelope(
      userId: userId,
      categoryId: categoryId,
      page: page,
      limit: limit,
    );
    // getEnvelopeDataMap ya desenvuelve `data`, el UC devuelve { items, pageInfo }
    if (data['items'] is List) {
      return (data['items'] as List)
          .whereType<Map<String, Object?>>()
          .map(UserRatingHistoryItemDto.fromJson)
          .toList();
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<List<LeaderboardEntryDto>> getLeaderboard(
    String categoryId, {
    int limit = 5,
  }) async {
    final data = await _profileApi.getRatingsLeaderboardEnvelope(
      categoryId: categoryId,
      limit: limit,
    );
    if (data['items'] is List) {
      return (data['items'] as List)
          .whereType<Map<String, Object?>>()
          .map(LeaderboardEntryDto.fromJson)
          .toList();
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }
}
