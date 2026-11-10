import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/formatting/fx_price_labels.dart';
import '../../data/monetization_repository.dart';
import 'waiting_confirmation_state.dart';

final class WaitingConfirmationCubit extends Cubit<WaitingConfirmationState> {
  WaitingConfirmationCubit({
    required MonetizationRepository monetizationRepository,
    required String matchId,
    String? transactionId,
  })  : _monetizationRepository = monetizationRepository,
        _matchId = matchId,
        _transactionId = transactionId,
        super(const WaitingConfirmationState());

  //? Corte de polling: el staff confirma manualmente en el panel web y puede
  //? tardar, pero no puede quedar reintentando para siempre si la pantalla
  //? se deja abierta. Con el backoff tope de 15s, 20 intentos son ~5
  //? minutos de margen — de sobra para una confirmación manual típica.
  static const int _maxPollAttempts = 20;

  final MonetizationRepository _monetizationRepository;
  final String _matchId;
  final String? _transactionId;
  Timer? _pollTimer;

  void start() {
    unawaited(_loadExchangeRates());
    unawaited(_pollOnce());
    _schedulePoll();
  }

  Future<void> _loadExchangeRates() async {
    final rates = await loadExchangeRatesSafelySV();
    if (isClosed) return;
    emit(state.copyWith(exchangeRates: rates));
  }

  void _schedulePoll() {
    _pollTimer?.cancel();
    _pollTimer = Timer(Duration(seconds: state.pollSeconds), () async {
      await _pollOnce();
      if (isClosed) return;
      if (state.status != 'PENDING') return;
      final attempts = state.pollAttempts + 1;
      if (attempts >= _maxPollAttempts) {
        emit(state.copyWith(pollAttempts: attempts, pollTimedOut: true));
        return;
      }
      emit(state.copyWith(
        pollAttempts: attempts,
        pollSeconds: (state.pollSeconds + 2).clamp(5, 15),
      ));
      _schedulePoll();
    });
  }

  void retryPoll() {
    emit(state.copyWith(pollTimedOut: false, pollSeconds: 5, pollAttempts: 0));
    unawaited(_pollOnce());
    _schedulePoll();
  }

  Future<void> _pollOnce() async {
    try {
      final txs = await _monetizationRepository.listMyTransactions(limit: 50);
      final forMatch = txs.transactions.where((t) => t.matchId == _matchId);
      final txId = _transactionId;
      final tx = txId != null && txId.isNotEmpty
          ? forMatch.where((t) => t.id == txId).firstOrNull
          : forMatch.isEmpty
              ? null
              : (forMatch.toList()..sort((a, b) => b.createdAt.compareTo(a.createdAt)))
                  .first;

      if (tx == null) return;
      if (isClosed) return;
      emit(state.copyWith(status: tx.status));
    } catch (_) {
      // Silencioso: el staff confirma en web; reintentamos en el siguiente poll.
    }
  }

  @override
  Future<void> close() {
    _pollTimer?.cancel();
    return super.close();
  }
}
