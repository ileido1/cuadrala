import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_scoreboard_state.dart';

// Not `final`: widget tests mock this cubit via `MockCubit implements
// TournamentScoreboardCubit` (see tournament_detail_screen_test.dart).
class TournamentScoreboardCubit extends Cubit<TournamentScoreboardState> {
  TournamentScoreboardCubit({
    required TournamentsRepository tournamentsRepository,
    required String tournamentId,
  })  : _tournamentsRepository = tournamentsRepository,
        _tournamentId = tournamentId,
        super(const TournamentScoreboardInitial());

  final TournamentsRepository _tournamentsRepository;
  final String _tournamentId;

  Future<void> load() async {
    emit(const TournamentScoreboardLoading());
    try {
      final scoreboard = await _tournamentsRepository.getTournamentScoreboard(
        tournamentId: _tournamentId,
      );
      if (scoreboard.rows.isEmpty) {
        emit(const TournamentScoreboardEmpty());
        return;
      }
      emit(TournamentScoreboardSuccess(scoreboard: scoreboard));
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo cargar la clasificación.';
      emit(TournamentScoreboardError(message: message));
    }
  }
}

