import 'package:equatable/equatable.dart';

import '../../data/models/pending_transaction_dto.dart';

sealed class PaymentsState extends Equatable {
  const PaymentsState();

  @override
  List<Object?> get props => [];
}

final class PaymentsInitial extends PaymentsState {
  const PaymentsInitial();
}

final class PaymentsLoading extends PaymentsState {
  const PaymentsLoading();
}

final class PaymentsLoaded extends PaymentsState {
  const PaymentsLoaded({required this.transactions});

  final List<PendingTransactionDto> transactions;

  @override
  List<Object?> get props => [transactions];
}

final class PaymentsEmpty extends PaymentsState {
  const PaymentsEmpty();
}

final class PaymentsError extends PaymentsState {
  const PaymentsError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}