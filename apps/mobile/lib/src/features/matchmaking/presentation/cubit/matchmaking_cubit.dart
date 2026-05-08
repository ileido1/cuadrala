import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/matchmaking_repository.dart';
import 'matchmaking_state.dart';

final class MatchmakingCubit extends Cubit<MatchmakingState> {
  MatchmakingCubit({
    required MatchmakingRepository repository,
    required String matchId,
  })  : _repository = repository,
        _matchId = matchId,
        super(const MatchmakingInitial());

  final MatchmakingRepository _repository;
  final String _matchId;

  Future<void> load() async {
    emit(const MatchmakingLoading());
    try {
      final suggestions = await _repository.listSuggestions(matchId: _matchId);
      emit(MatchmakingLoaded(suggestions: suggestions));
    } on AppFailure catch (e) {
      emit(MatchmakingFailure(message: e.message));
    } catch (_) {
      emit(const MatchmakingFailure(message: 'No se pudieron cargar las sugerencias.'));
    }
  }
}
