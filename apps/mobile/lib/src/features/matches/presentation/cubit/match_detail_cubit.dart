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

  /// Estado de pago del viewer para esta partida: confirmado (staff aprobó),
  /// pendiente (comprobante enviado, en revisión) o ninguno.
  Future<({bool confirmed, bool pending})> _viewerPaymentStatus(
    MatchDetailDto match,
    String viewerUserId,
  ) async {
    if (match.pricePerPlayerCents <= 0) return (confirmed: false, pending: false);
    if (!match.participants.any((p) => p.userId == viewerUserId)) {
      return (confirmed: false, pending: false);
    }
    try {
      final txs = await _monetizationRepository.listMyTransactions(limit: 100);
      final mine =
          txs.transactions.where((t) => t.matchId == _matchId).toList();
      final confirmed = mine.any((t) => t.status == 'CONFIRMED');
      // Pendiente = existe comprobante no rechazado ni confirmado aún.
      final pending = !confirmed &&
          mine.any((t) => t.status != 'REJECTED' && t.status != 'CANCELLED');
      return (confirmed: confirmed, pending: pending);
    } catch (_) {
      return (confirmed: false, pending: false);
    }
  }

  Future<MatchDetailLoaded> _loadedFromMatch(
    MatchDetailDto match,
    String viewerUserId, {
    bool actionLoading = false,
    String? actionMessage,
    bool actionMessageIsError = false,
  }) async {
    final payment = await _viewerPaymentStatus(match, viewerUserId);
    return MatchDetailLoaded(
      match: match,
      viewerUserId: viewerUserId,
      viewerHasConfirmedPayment: payment.confirmed,
      viewerHasPendingPayment: payment.pending,
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
        viewerHasPendingPayment: current.viewerHasPendingPayment,
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
          viewerHasPendingPayment: current.viewerHasPendingPayment,
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
        viewerHasPendingPayment: current.viewerHasPendingPayment,
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
          viewerHasPendingPayment: current.viewerHasPendingPayment,
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
        viewerHasPendingPayment: current.viewerHasPendingPayment,
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
          viewerHasPendingPayment: current.viewerHasPendingPayment,
          actionMessage: message,
          actionMessageIsError: true,
        ),
      );
    }
  }
}
