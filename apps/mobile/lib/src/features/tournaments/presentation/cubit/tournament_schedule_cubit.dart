import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/models/tournament_schedule_dto.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_schedule_state.dart';

// Not `final`: widget tests mock this cubit via `MockCubit implements
// TournamentScheduleCubit` (see tournament_detail_screen_test.dart).
class TournamentScheduleCubit extends Cubit<TournamentScheduleState> {
  TournamentScheduleCubit({
    required TournamentsRepository tournamentsRepository,
    required String tournamentId,
  })  : _tournamentsRepository = tournamentsRepository,
        _tournamentId = tournamentId,
        super(const TournamentScheduleInitial());

  final TournamentsRepository _tournamentsRepository;
  final String _tournamentId;

  Future<void> load() async {
    emit(const TournamentScheduleLoading());
    try {
      final schedule = await _tournamentsRepository.getTournamentSchedule(
        tournamentId: _tournamentId,
      );
      if (schedule.rounds.isEmpty) {
        emit(const TournamentScheduleEmpty());
        return;
      }
      emit(TournamentScheduleSuccess(schedule: schedule));
    } on AppFailure catch (e) {
      emit(TournamentScheduleError(message: e.message));
    } catch (_) {
      emit(const TournamentScheduleError(message: 'No se pudo cargar el calendario.'));
    }
  }

  Future<void> generate({
    bool? doubleRound,
    bool? thirdPlaceMatch,
  }) async {
    emit(const TournamentScheduleGenerating());
    try {
      final schedule = await _tournamentsRepository.generateTournamentSchedule(
        tournamentId: _tournamentId,
        doubleRound: doubleRound,
        thirdPlaceMatch: thirdPlaceMatch,
      );
      emit(TournamentScheduleSuccess(schedule: schedule));
    } on AppFailure catch (e) {
      if (e.code == 'HTTP_501' || e.code == 'SCHEDULE_UNSUPPORTED') {
        emit(const TournamentScheduleUnsupported());
        return;
      }
      if (e.code == 'HTTP_409' || e.code == 'SCHEDULE_CONFLICT') {
        emit(const TournamentScheduleConflict());
        return;
      }
      emit(TournamentScheduleError(message: e.message));
    } catch (e) {
      //? Re-throw programming errors para logs/debugging
      rethrow;
    }
  }

  /// "Cargar resultado" (M11c): postea via el endpoint de resultados (D1) y
  /// recarga el calendario para reflejar el estado real (avance de ronda,
  /// score materializado). Un fallo (p. ej. 409 `RESULTADO_YA_CARGADO`) se
  /// propaga tal cual — no emite estado ni recarga — para que
  /// `ResultEntrySheet` muestre el mensaje del backend sin perder lo tipeado.
  Future<void> submitMatchResult({
    required String matchId,
    required List<TournamentScheduleMatchScoreDto> scores,
  }) async {
    await _tournamentsRepository.registerMatchResult(
      tournamentId: _tournamentId,
      matchId: matchId,
      scores: scores,
    );
    await load();
  }

  Future<void> rescheduleMatch({
    required int roundNumber,
    required int matchNumber,
    required String courtId,
    required DateTime scheduledAt,
  }) async {
    await _tournamentsRepository.rescheduleTournamentMatch(
      tournamentId: _tournamentId,
      roundNumber: roundNumber,
      matchNumber: matchNumber,
      courtId: courtId,
      scheduledAt: scheduledAt,
    );
    await load();
  }
}
