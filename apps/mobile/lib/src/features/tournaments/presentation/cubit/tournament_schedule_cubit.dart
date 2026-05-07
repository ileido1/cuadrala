import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_schedule_state.dart';

final class TournamentScheduleCubit extends Cubit<TournamentScheduleState> {
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
      emit(const TournamentScheduleError(message: 'No se pudo cargar el fixture.'));
    }
  }

  Future<void> generate() async {
    emit(const TournamentScheduleGenerating());
    try {
      final schedule = await _tournamentsRepository.generateTournamentSchedule(
        tournamentId: _tournamentId,
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
    } catch (_) {
      emit(const TournamentScheduleError(message: 'No se pudo generar el fixture.'));
    }
  }
}

