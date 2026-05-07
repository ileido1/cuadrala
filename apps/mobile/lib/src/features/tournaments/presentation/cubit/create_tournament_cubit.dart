import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/models/create_tournament_request.dart';
import '../../data/tournaments_repository.dart';
import 'create_tournament_state.dart';

final class CreateTournamentCubit extends Cubit<CreateTournamentState> {
  CreateTournamentCubit({required TournamentsRepository tournamentsRepository})
      : _tournamentsRepository = tournamentsRepository,
        super(const CreateTournamentInitial());

  final TournamentsRepository _tournamentsRepository;

  Future<void> submit(CreateTournamentRequest request) async {
    final name = request.name.trim();
    if (name.isEmpty) {
      emit(const CreateTournamentError(message: 'El nombre es obligatorio.'));
      return;
    }

    emit(const CreateTournamentSubmitting());
    try {
      final res = await _tournamentsRepository.createTournament(request: request);
      emit(CreateTournamentSuccess(tournamentId: res.id));
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo crear el torneo.';
      emit(CreateTournamentError(message: message));
    }
  }
}

