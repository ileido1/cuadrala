import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/formatting/fx_price_labels.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../../monetization/data/monetization_repository.dart';
import '../../../profile/data/models/user_me_dto.dart';
import '../../../profile/data/models/user_rating_dto.dart';
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
  List<ExchangeRateRow> _exchangeRates = const [];

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

  /// Pago confirmado real de cada participante que NO es el viewer. El
  /// layout de cancha (`_CourtSection` en match_detail_screen.dart) asumía
  /// "pagado" para cualquiera que no fuera el viewer sin consultar nada —
  /// por eso se veía invertido según quién mirara la partida.
  Future<Map<String, bool>> _otherParticipantsConfirmedPayment(
    MatchDetailDto match,
    String viewerUserId,
  ) async {
    if (match.pricePerPlayerCents <= 0) return const {};
    final others = match.participants.where((p) => p.userId != viewerUserId);
    final entries = await Future.wait(
      others.map((p) async {
        try {
          final txs = await _monetizationRepository.listUserTransactions(
            userId: p.userId,
            limit: 100,
          );
          final confirmed = txs.transactions.any(
            (t) => t.matchId == _matchId && t.status == 'CONFIRMED',
          );
          return MapEntry(p.userId, confirmed);
        } catch (_) {
          return MapEntry(p.userId, false);
        }
      }),
    );
    return Map.fromEntries(entries);
  }

  /// Cambio de ELO del viewer para este match (issue #129): el resultado se
  /// cierra recién cuando las 4 confirmaciones llegan — ninguna pantalla del
  /// flujo de propuesta/confirmación puede saber el número al momento de su
  /// propia acción, así que se consulta el historial de ELO del viewer (ya
  /// expuesto por GET /users/:id/ratings/history) y se busca la fila de
  /// este matchId. `null` mientras el resultado sigue sin confirmarse.
  Future<UserRatingHistoryItemDto?> _viewerEloChange(
    MatchDetailDto match,
    String viewerUserId,
  ) async {
    if (match.status != 'FINISHED' || !match.affectsElo) return null;
    try {
      final history = await _profileRepository.getUserRatingHistory(
        userId: viewerUserId,
        categoryId: match.categoryId,
        limit: 5,
      );
      return history.where((item) => item.matchId == _matchId).firstOrNull;
    } catch (_) {
      return null;
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
    final othersPaid = await _otherParticipantsConfirmedPayment(
      match,
      viewerUserId,
    );
    final eloChange = await _viewerEloChange(match, viewerUserId);
    return MatchDetailLoaded(
      match: match,
      viewerUserId: viewerUserId,
      viewerHasConfirmedPayment: payment.confirmed,
      viewerHasPendingPayment: payment.pending,
      participantsConfirmedPayment: othersPaid,
      actionLoading: actionLoading,
      actionMessage: actionMessage,
      actionMessageIsError: actionMessageIsError,
      exchangeRates: _exchangeRates,
      viewerEloChange: eloChange,
    );
  }

  Future<void> load() async {
    emit(const MatchDetailLoading());
    try {
      final results = await Future.wait<Object>([
        _profileRepository.getMe(),
        loadExchangeRatesSafelySV(),
      ]);
      final me = results[0] as UserMeDto;
      _viewerUserId = me.id;
      _exchangeRates = results[1] as List<ExchangeRateRow>;
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
        participantsConfirmedPayment: current.participantsConfirmedPayment,
        actionLoading: true,
        exchangeRates: current.exchangeRates,
        viewerEloChange: current.viewerEloChange,
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
          participantsConfirmedPayment: current.participantsConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
          exchangeRates: current.exchangeRates,
          viewerEloChange: current.viewerEloChange,
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
        participantsConfirmedPayment: current.participantsConfirmedPayment,
        actionLoading: true,
        exchangeRates: current.exchangeRates,
        viewerEloChange: current.viewerEloChange,
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
          participantsConfirmedPayment: current.participantsConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
          exchangeRates: current.exchangeRates,
          viewerEloChange: current.viewerEloChange,
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
        participantsConfirmedPayment: current.participantsConfirmedPayment,
        actionLoading: true,
        exchangeRates: current.exchangeRates,
        viewerEloChange: current.viewerEloChange,
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
          participantsConfirmedPayment: current.participantsConfirmedPayment,
          actionMessage: message,
          actionMessageIsError: true,
          exchangeRates: current.exchangeRates,
          viewerEloChange: current.viewerEloChange,
        ),
      );
    }
  }
}
