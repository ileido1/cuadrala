import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_repository.dart';
import 'tournament_registrations_state.dart';

final class TournamentRegistrationsCubit extends Cubit<TournamentRegistrationsState> {
  TournamentRegistrationsCubit({
    required TournamentsRepository tournamentsRepository,
    required String tournamentId,
  })  : _repo = tournamentsRepository,
        _tournamentId = tournamentId,
        super(const TournamentRegistrationsInitial());

  final TournamentsRepository _repo;
  final String _tournamentId;

  Future<void> load() async {
    emit(const TournamentRegistrationsLoading());
    try {
      final items = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(TournamentRegistrationsLoaded(items: items, total: items.length));
    } on AppFailure catch (e) {
      emit(TournamentRegistrationsFailure(message: e.message));
    } catch (_) {
      emit(const TournamentRegistrationsFailure(message: 'No se pudieron cargar las inscripciones.'));
    }
  }

  Future<void> register(String userId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.registering) return;

    emit(TournamentRegistrationsLoaded(
      items: current.items,
      total: current.total,
      registering: true,
    ));

    try {
      await _repo.registerParticipant(tournamentId: _tournamentId, userId: userId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(TournamentRegistrationsLoaded(items: refreshed, total: refreshed.length));
    } on AppFailure catch (e) {
      emit(TournamentRegistrationsLoaded(
        items: current.items,
        total: current.total,
        registering: false,
        registerError: e.message,
      ));
    } catch (_) {
      emit(TournamentRegistrationsLoaded(
        items: current.items,
        total: current.total,
        registering: false,
        registerError: 'No se pudo completar la inscripción.',
      ));
    }
  }

  Future<void> withdraw(String userId) async {
    final current = state;
    if (current is! TournamentRegistrationsLoaded) return;
    if (current.registering) return;

    emit(TournamentRegistrationsLoaded(
      items: current.items,
      total: current.total,
      registering: true,
    ));

    try {
      await _repo.withdrawRegistration(tournamentId: _tournamentId, userId: userId);
      final refreshed = await _repo.listRegistrations(tournamentId: _tournamentId);
      emit(TournamentRegistrationsLoaded(items: refreshed, total: refreshed.length));
    } on AppFailure catch (e) {
      emit(TournamentRegistrationsLoaded(
        items: current.items,
        total: current.total,
        registering: false,
        registerError: e.message,
      ));
    } catch (_) {
      emit(TournamentRegistrationsLoaded(
        items: current.items,
        total: current.total,
        registering: false,
        registerError: 'No se pudo cancelar la inscripción.',
      ));
    }
  }
}
