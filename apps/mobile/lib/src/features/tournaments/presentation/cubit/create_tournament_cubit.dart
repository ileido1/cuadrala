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
  String? _createdTournamentId;
  bool _publishing = false;

  Future<void> submit(CreateTournamentRequest request) async {
    if (state is CreateTournamentSubmitting || _createdTournamentId != null) {
      return;
    }
    final name = request.name.trim();
    if (name.isEmpty) {
      emit(const CreateTournamentError(message: 'El nombre es obligatorio.'));
      return;
    }

    emit(const CreateTournamentSubmitting());
    try {
      final res = await _tournamentsRepository.createTournament(
        request: request,
      );
      if (res.tournamentId.isEmpty) {
        emit(
          const CreateTournamentError(
            message: 'El servidor no retornó un ID válido para el torneo.',
          ),
        );
      } else {
        if (request.publishOnCreate) {
          _createdTournamentId = res.tournamentId;
          await _publishCreatedTournament(emitSubmitting: false);
          return;
        }
        emit(CreateTournamentSuccess(tournamentId: res.tournamentId));
      }
    } catch (e) {
      final message = e is AppFailure
          ? e.message
          : 'No se pudo crear el torneo.';
      emit(CreateTournamentError(message: message));
    }
  }

  Future<void> retryPublish() async {
    if (_createdTournamentId == null || _publishing || isClosed) return;
    await _publishCreatedTournament();
  }

  Future<void> _publishCreatedTournament({bool emitSubmitting = true}) async {
    final tournamentId = _createdTournamentId;
    if (tournamentId == null || _publishing || isClosed) return;
    _publishing = true;
    if (emitSubmitting) emit(const CreateTournamentSubmitting());
    try {
      await _tournamentsRepository.updateTournamentStatus(
        tournamentId: tournamentId,
        status: 'OPEN',
      );
      _createdTournamentId = null;
      emit(CreateTournamentSuccess(tournamentId: tournamentId));
    } catch (error) {
      final message = error is AppFailure
          ? error.message
          : 'El torneo se creó, pero no se pudo publicar.';
      emit(
        CreateTournamentPublishError(
          tournamentId: tournamentId,
          message: message,
        ),
      );
    } finally {
      _publishing = false;
    }
  }
}
