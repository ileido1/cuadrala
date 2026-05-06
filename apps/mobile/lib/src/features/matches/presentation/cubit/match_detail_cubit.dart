import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/matches_repository.dart';
import 'match_detail_state.dart';

final class MatchDetailCubit extends Cubit<MatchDetailState> {
  MatchDetailCubit({
    required MatchesRepository matchesRepository,
    required ProfileRepository profileRepository,
    required String matchId,
  })  : _matchesRepository = matchesRepository,
        _profileRepository = profileRepository,
        _matchId = matchId,
        super(const MatchDetailInitial());

  final MatchesRepository _matchesRepository;
  final ProfileRepository _profileRepository;
  final String _matchId;
  String? _viewerUserId;

  Future<void> load() async {
    emit(const MatchDetailLoading());
    try {
      final me = await _profileRepository.getMe();
      _viewerUserId = me.id;
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: _viewerUserId!,
        ),
      );
    } catch (e) {
      if (e is AppFailure && e.code == 'HTTP_404') {
        emit(const MatchDetailNotFound());
        return;
      }
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el detalle.';
      emit(MatchDetailFailure(message: message));
    }
  }

  Future<void> join() async {
    final current = state;
    if (current is! MatchDetailLoaded) return;
    if (current.actionLoading) return;

    emit(
      MatchDetailLoaded(
        match: current.match,
        viewerUserId: current.viewerUserId,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.joinMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: 'Te uniste a la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo unir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: message,
        ),
      );
    }
  }

  Future<void> leave() async {
    final current = state;
    if (current is! MatchDetailLoaded) return;
    if (current.actionLoading) return;

    emit(
      MatchDetailLoaded(
        match: current.match,
        viewerUserId: current.viewerUserId,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.leaveMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: 'Saliste de la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo salir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: message,
        ),
      );
    }
  }

  Future<void> cancel() async {
    await _runAction(
      action: () => _matchesRepository.cancelMatch(_matchId),
      successMessage: 'Partida cancelada.',
      fallbackError: 'No se pudo cancelar.',
    );
  }

  Future<void> start() async {
    await _runAction(
      action: () => _matchesRepository.startMatch(_matchId),
      successMessage: 'Partida iniciada.',
      fallbackError: 'No se pudo iniciar.',
    );
  }

  Future<void> finish() async {
    await _runAction(
      action: () => _matchesRepository.finishMatch(_matchId),
      successMessage: 'Partida finalizada.',
      fallbackError: 'No se pudo finalizar.',
    );
  }

  Future<void> _runAction({
    required Future<void> Function() action,
    required String successMessage,
    required String fallbackError,
  }) async {
    final current = state;
    if (current is! MatchDetailLoaded) return;
    if (current.actionLoading) return;

    emit(
      MatchDetailLoaded(
        match: current.match,
        viewerUserId: current.viewerUserId,
        actionLoading: true,
      ),
    );

    try {
      await action();
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        MatchDetailLoaded(
          match: match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: successMessage,
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : fallbackError;
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          actionLoading: false,
          actionMessage: message,
        ),
      );
    }
  }
}
