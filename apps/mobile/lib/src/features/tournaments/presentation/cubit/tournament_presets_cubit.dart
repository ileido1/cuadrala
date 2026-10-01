import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_presets_state.dart';

final class TournamentPresetsCubit extends Cubit<TournamentPresetsState> {
  TournamentPresetsCubit({required TournamentsRepository tournamentsRepository})
    : _tournamentsRepository = tournamentsRepository,
      super(const TournamentPresetsInitial());

  final TournamentsRepository _tournamentsRepository;
  int _loadGeneration = 0;

  Future<void> load({required String sportId}) async {
    final generation = ++_loadGeneration;
    emit(const TournamentPresetsLoading());
    try {
      final presets = await _tournamentsRepository.getPresetsBySportId(
        sportId: sportId,
      );
      if (isClosed || generation != _loadGeneration) return;
      if (presets.isEmpty) {
        emit(const TournamentPresetsEmpty());
        return;
      }
      emit(TournamentPresetsSuccess(presets: presets));
    } catch (e) {
      if (isClosed || generation != _loadGeneration) return;
      final message = e is AppFailure
          ? e.message
          : 'No se pudieron cargar los presets.';
      emit(TournamentPresetsError(message: message));
    }
  }
}
