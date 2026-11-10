import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';

final class WaitingConfirmationState extends Equatable {
  const WaitingConfirmationState({
    this.status = 'PENDING',
    this.pollSeconds = 5,
    this.pollAttempts = 0,
    this.pollTimedOut = false,
    this.exchangeRates = const [],
  });

  final String status;
  final int pollSeconds;
  final int pollAttempts;
  final bool pollTimedOut;
  final List<ExchangeRateRow> exchangeRates;

  WaitingConfirmationState copyWith({
    String? status,
    int? pollSeconds,
    int? pollAttempts,
    bool? pollTimedOut,
    List<ExchangeRateRow>? exchangeRates,
  }) {
    return WaitingConfirmationState(
      status: status ?? this.status,
      pollSeconds: pollSeconds ?? this.pollSeconds,
      pollAttempts: pollAttempts ?? this.pollAttempts,
      pollTimedOut: pollTimedOut ?? this.pollTimedOut,
      exchangeRates: exchangeRates ?? this.exchangeRates,
    );
  }

  @override
  List<Object?> get props => [
        status,
        pollSeconds,
        pollAttempts,
        pollTimedOut,
        exchangeRates,
      ];
}
