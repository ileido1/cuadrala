import '../../../core/failures/app_failure.dart';
import 'models/create_tournament_request.dart';
import 'models/create_tournament_response.dart';
import 'models/tournament_preset_dto.dart';
import 'models/tournament_schedule_dto.dart';
import 'models/tournament_scoreboard_dto.dart';
import 'tournaments_api.dart';

class TournamentsRepository {
  TournamentsRepository({required TournamentsApi tournamentsApi})
      : _tournamentsApi = tournamentsApi;

  final TournamentsApi _tournamentsApi;

  Future<List<TournamentPresetDto>> getPresetsBySportId({
    required String sportId,
  }) async {
    final data = await _tournamentsApi.listTournamentFormatPresetsEnvelope(
      sportId: sportId,
    );

    final raw = data['items'];
    final items = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => Map<String, Object?>.from(e))
            .map(TournamentPresetDto.fromJson)
            .toList()
        : <TournamentPresetDto>[];
    return items;
  }

  Future<CreateTournamentResponse> createTournament({
    required Object? request,
  }) async {
    final req = request is CreateTournamentRequest ? request : null;
    if (req == null) {
      throw const AppFailure(
        code: 'INVALID_REQUEST',
        message: 'Solicitud inválida.',
      );
    }

    final data = await _tournamentsApi.createTournamentEnvelope(
      body: req.toJson(),
    );
    return CreateTournamentResponse.fromJson(data);
  }

  Future<TournamentScheduleDto> getTournamentSchedule({
    required String tournamentId,
  }) async {
    try {
      final data = await _tournamentsApi.getTournamentScheduleEnvelope(
        tournamentId: tournamentId,
      );
      return TournamentScheduleDto.fromJson(data);
    } on AppFailure catch (e) {
      if (e.code == 'HTTP_404') {
        return TournamentScheduleDto.empty();
      }
      rethrow;
    }
  }

  Future<TournamentScheduleDto> generateTournamentSchedule({
    required String tournamentId,
  }) async {
    try {
      final data = await _tournamentsApi.generateTournamentScheduleEnvelope(
        tournamentId: tournamentId,
      );
      return TournamentScheduleDto.fromJson(data);
    } on AppFailure catch (e) {
      if (e.code == 'HTTP_501') {
        throw AppFailure(
          code: 'SCHEDULE_UNSUPPORTED',
          message: e.message,
          details: e.details,
        );
      }
      if (e.code == 'HTTP_409') {
        throw AppFailure(
          code: 'SCHEDULE_CONFLICT',
          message: e.message,
          details: e.details,
        );
      }
      rethrow;
    }
  }

  Future<TournamentScoreboardDto> getTournamentScoreboard({
    required String tournamentId,
  }) async {
    final data = await _tournamentsApi.getTournamentScoreboardEnvelope(
      tournamentId: tournamentId,
    );
    return TournamentScoreboardDto.fromJson(data);
  }
}

