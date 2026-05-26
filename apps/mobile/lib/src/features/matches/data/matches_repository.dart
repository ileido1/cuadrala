import '../../../core/failures/app_failure.dart';
import '../../catalog/data/catalog_repository.dart';
import 'matches_api.dart';
import 'models/match_detail_dto.dart';
import 'models/open_match_dto.dart';

class MatchesRepository {
  MatchesRepository({
    required MatchesApi matchesApi,
    required CatalogRepository catalogRepository,
  })  : _matchesApi = matchesApi,
        _catalogRepository = catalogRepository;

  final MatchesApi _matchesApi;
  final CatalogRepository _catalogRepository;

  Future<OpenMatchesPage> listOpenMatches({
    required String sportId,
    int page = 1,
    int limit = 20,
    String? categoryId,
  }) async {
    final data = await _matchesApi.listOpenMatchesEnvelope(
      sportId: sportId,
      page: page,
      limit: limit,
      categoryId: categoryId,
    );

    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final pageInfoRaw = data['pageInfo'];
    if (pageInfoRaw is! Map<String, Object?>) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(OpenMatchDto.fromJson)
        .toList();

    return OpenMatchesPage(
      items: items,
      page: (pageInfoRaw['page'] as num).toInt(),
      limit: (pageInfoRaw['limit'] as num).toInt(),
      total: (pageInfoRaw['total'] as num).toInt(),
    );
  }

  /// Returns the authenticated user's own matches (as organizer or participant).
  /// Named with the SV suffix to align with the backend route convention.
  Future<OpenMatchesPage> listMyMatchesSV({
    int page = 1,
    int limit = 20,
  }) async {
    final data = await _matchesApi.listMyMatchesEnvelope(
      page: page,
      limit: limit,
    );

    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final pageInfoRaw = data['pageInfo'];
    if (pageInfoRaw is! Map<String, Object?>) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(OpenMatchDto.fromJson)
        .toList();

    return OpenMatchesPage(
      items: items,
      page: (pageInfoRaw['page'] as num).toInt(),
      limit: (pageInfoRaw['limit'] as num).toInt(),
      total: (pageInfoRaw['total'] as num).toInt(),
    );
  }

  Future<MatchDetailDto> getMatchById(String matchId) async {
    final data = await _matchesApi.getMatchEnvelope(matchId: matchId);
    final matchRaw = data['match'] ?? data['matchDetail'] ?? data['item'];
    if (matchRaw is Map<String, Object?>) {
      return MatchDetailDto.fromJson(matchRaw);
    }

    // Backend actual: `data` es el DTO del partido (sin wrapper).
    if (data['id'] is String) {
      return MatchDetailDto.fromJson(data);
    }

    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<MatchDetailDto> createMatch({
    required String sportId,
    required String categoryId,
    String? type,
    DateTime? scheduledAt,
    String? courtId,
    String? venueId,
    String? tournamentId,
    int? pricePerPlayerCents,
    int? maxParticipants,
    int? durationMinutes,
    String? notes,
  }) async {
    final json = await _matchesApi.createMatchEnvelope(
      body: {
        'sportId': sportId,
        'categoryId': categoryId,
        if (type != null) 'type': type,
        if (scheduledAt != null) 'scheduledAt': scheduledAt.toIso8601String(),
        if (courtId != null) 'courtId': courtId,
        if (venueId != null) 'venueId': venueId,
        if (tournamentId != null) 'tournamentId': tournamentId,
        if (pricePerPlayerCents != null) 'pricePerPlayerCents': pricePerPlayerCents,
        if (maxParticipants != null) 'maxParticipants': maxParticipants,
        if (durationMinutes != null) 'durationMinutes': durationMinutes,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
    final data = json['data'];
    if (data is Map<String, Object?>) {
      return MatchDetailDto.fromJson(data);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<void> joinMatch(String matchId) async {
    await _matchesApi.joinMatchEnvelope(matchId: matchId);
  }

  Future<void> leaveMatch(String matchId) {
    return _matchesApi.leaveMatch(matchId: matchId);
  }

  Future<void> cancelMatch(String matchId) async {
    await _matchesApi.cancelMatchEnvelope(matchId: matchId);
  }

  Future<void> startMatch(String matchId) {
    return _matchesApi.startMatch(matchId: matchId);
  }

  Future<void> finishMatch(String matchId) {
    return _matchesApi.finishMatch(matchId: matchId);
  }

  Future<void> upsertResultDraft({
    required String matchId,
    required List<Map<String, Object?>> scores,
    List<Map<String, Object?>>? teams,
    List<Map<String, Object?>>? sets,
    Map<String, String>? sideByUserId,
  }) async {
    await _matchesApi.upsertResultDraftEnvelope(
      matchId: matchId,
      body: {
        'scores': scores,
        if (teams != null) 'teams': teams,
        if (sets != null) 'sets': sets,
        if (sideByUserId != null) 'sideByUserId': sideByUserId,
      },
    );
  }

  Future<Map<String, Object?>> confirmResultDraft({
    required String matchId,
    required String status, // 'CONFIRMED' | 'REJECTED'
  }) async {
    final json = await _matchesApi.confirmResultDraftEnvelope(
      matchId: matchId,
      body: {'status': status},
    );
    final data = json['data'];
    if (data is Map<String, Object?>) return data;
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<void> reproposeResultDraft({
    required String matchId,
    required List<Map<String, Object?>> scores,
    List<Map<String, Object?>>? teams,
    List<Map<String, Object?>>? sets,
    Map<String, String>? sideByUserId,
  }) async {
    await _matchesApi.reproposeResultDraftEnvelope(
      matchId: matchId,
      body: {
        'scores': scores,
        if (teams != null) 'teams': teams,
        if (sets != null) 'sets': sets,
        if (sideByUserId != null) 'sideByUserId': sideByUserId,
      },
    );
  }

  /// Resuelve un `sportId` estable para discovery: prioriza PADEL si existe.
  Future<String> resolveDefaultSportId() async {
    final sports = await _catalogRepository.listSports();
    if (sports.isEmpty) {
      throw const AppFailure(
        code: 'SPORTS_EMPTY',
        message: 'No hay deportes configurados en el servidor.',
      );
    }

    for (final s in sports) {
      if (s.code.toUpperCase() == 'PADEL') return s.id;
    }
    return sports.first.id;
  }
}
