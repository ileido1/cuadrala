import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/payments_repository.dart';
import 'payments_state.dart';

final class PaymentsCubit extends Cubit<PaymentsState> {
  PaymentsCubit({
    required PaymentsRepository repository,
    required String venueId,
  })  : _repository = repository,
        _venueId = venueId,
        super(const PaymentsInitial());

  final PaymentsRepository _repository;
  final String _venueId;
  Timer? _pollingTimer;

  Future<void> load() async {
    _cancelTimer();
    emit(const PaymentsLoading());
    try {
      final transactions = await _repository.getPendingTransactions(venueId: _venueId);
      if (transactions.isEmpty) {
        emit(const PaymentsEmpty());
      } else {
        emit(PaymentsLoaded(transactions: transactions));
      }
    } on AppFailure catch (e) {
      emit(PaymentsError(message: e.message));
    } catch (_) {
      emit(const PaymentsError(message: 'No se pudieron cargar los pagos pendientes.'));
    }
    _startPolling();
  }

  Future<void> refresh() async {
    _cancelTimer();
    try {
      final transactions = await _repository.getPendingTransactions(venueId: _venueId);
      if (transactions.isEmpty) {
        emit(const PaymentsEmpty());
      } else {
        emit(PaymentsLoaded(transactions: transactions));
      }
    } on AppFailure catch (e) {
      emit(PaymentsError(message: e.message));
    } catch (_) {
      emit(const PaymentsError(message: 'No se pudieron cargar los pagos pendientes.'));
    }
    _startPolling();
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      refresh();
    });
  }

  void _cancelTimer() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  @override
  Future<void> close() {
    _cancelTimer();
    return super.close();
  }
}