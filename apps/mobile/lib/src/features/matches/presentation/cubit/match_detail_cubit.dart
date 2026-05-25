import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../monetization/data/monetization_repository.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/matches_repository.dart';
import '../../data/models/match_detail_dto.dart';
import 'match_detail_state.dart';

final class MatchDetailCubit extends Cubit<MatchDetailState> {
  MatchDetailCubit({
    required MatchesRepository matchesRepository,
    required ProfileRepository profileRepository,
    required MonetizationRepository monetizationRepository,
    required String matchId,
  })  : _matchesRepository = matchesRepository,
        _profileRepository = profileRepository,
        _monetizationRepository = monetizationRepository,
        _matchId = matchId,
        super(const MatchDetailInitial());

  final MatchesRepository _matchesRepository;
  final ProfileRepository _profileRepository;
  final MonetizationRepository _monetizationRepository;
  final String _matchId;
  String? _viewerUserId;

  Future<bool> _viewerHasConfirmedPayment(
    MatchDetailDto match,
    String viewerUserId,
  ) async {
    if (match.pricePerPlayerCents <= 0) return false;
    if (!match.participants.any((p) => p.userId == viewerUserId)) {
      return false;
    }
    try {
      final txs = await _monetizationRepository.listMyTransactions(limit: 100);
      return txs.transactions.any(
        (t) => t.matchId == _matchId && t.status == 'CONFIRMED',
      );
    } catch (_) {
      return false;
    }
  }

  Future<MatchDetailLoaded> _loadedFromMatch(
    MatchDetailDto match,
    String viewerUserId, {
    bool actionLoading = false,
    String? actionMessage,
    bool actionMessageIsError = false,
  }) async {
    final hasPaid = await _viewerHasConfirmedPayment(match, viewerUserId);
    return MatchDetailLoaded(
      match: match,
      viewerUserId: viewerUserId,
      viewerHasConfirmedPayment: hasPaid,
      actionLoading: actionLoading,
      actionMessage: actionMessage,
      actionMessageIsError: actionMessageIsError,
    );
  }

  Future<void> load() async {
    emit(const MatchDetailLoading());
    try {
      final me = await _profileRepository.getMe();
      _viewerUserId = me.id;
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(await _loadedFromMatch(match, _viewerUserId!));
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
        viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.joinMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        await _loadedFromMatch(
          match,
          current.viewerUserId,
          actionMessage: 'Te uniste a la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo unir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
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
        viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
        actionLoading: true,
      ),
    );

    try {
      await _matchesRepository.leaveMatch(_matchId);
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        await _loadedFromMatch(
          match,
          current.viewerUserId,
          actionMessage: 'Saliste de la partida.',
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo salir.';
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
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
        viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
        actionLoading: true,
      ),
    );

    try {
      await action();
      final match = await _matchesRepository.getMatchById(_matchId);
      emit(
        await _loadedFromMatch(
          match,
          current.viewerUserId,
          actionMessage: successMessage,
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : fallbackError;
      emit(
        MatchDetailLoaded(
          match: current.match,
          viewerUserId: current.viewerUserId,
          viewerHasConfirmedPayment: current.viewerHasConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
        ),
      );
    }
  }
}
