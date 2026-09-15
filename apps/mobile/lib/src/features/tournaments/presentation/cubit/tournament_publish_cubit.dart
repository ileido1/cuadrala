import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_publish_state.dart';

class TournamentPublishCubit extends Cubit<TournamentPublishState> {
  TournamentPublishCubit({
    required TournamentsRepository tournamentsRepository,
    required String tournamentId,
    required String status,
    required String visibility,
  }) : _tournamentsRepository = tournamentsRepository,
       _tournamentId = tournamentId,
       super(TournamentPublishState(status: status, visibility: visibility));

  final TournamentsRepository _tournamentsRepository;
  final String _tournamentId;

  Future<void> updateStatus(String status) async {
    if (status == state.status || state.submitting) return;

    emit(state.copyWith(submitting: true, clearError: true));
    try {
      await _tournamentsRepository.updateTournamentStatus(
        tournamentId: _tournamentId,
        status: status,
      );
      emit(state.copyWith(status: status, submitting: false));
    } on AppFailure catch (error) {
      emit(state.copyWith(submitting: false, error: error.message));
    } catch (_) {
      emit(
        state.copyWith(
          submitting: false,
          error: 'No se pudo cambiar el estado del torneo.',
        ),
      );
    }
  }

  Future<void> setVisibility(String visibility) async {
    if (visibility == state.visibility || state.submitting) return;

    final previousVisibility = state.visibility;
    emit(
      state.copyWith(
        visibility: visibility,
        submitting: true,
        clearError: true,
      ),
    );
    try {
      await _tournamentsRepository.updateTournamentVisibility(
        tournamentId: _tournamentId,
        visibility: visibility,
      );
      emit(state.copyWith(submitting: false));
    } on AppFailure catch (error) {
      emit(
        state.copyWith(
          visibility: previousVisibility,
          submitting: false,
          error: error.message,
        ),
      );
    } catch (_) {
      emit(
        state.copyWith(
          visibility: previousVisibility,
          submitting: false,
          error: 'No se pudo cambiar la visibilidad del torneo.',
        ),
      );
    }
  }
}
