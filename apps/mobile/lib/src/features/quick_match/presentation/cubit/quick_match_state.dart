import 'package:equatable/equatable.dart';
import '../../../../core/formatting/money_conversion.dart';
import '../../data/models/quick_match_search_dto.dart';

sealed class QuickMatchState extends Equatable {
  const QuickMatchState();
  @override
  List<Object?> get props => [];
}

final class QuickMatchInitial extends QuickMatchState {
  const QuickMatchInitial();
}

final class QuickMatchLoading extends QuickMatchState {
  const QuickMatchLoading();
}

final class QuickMatchIdle extends QuickMatchState {
  const QuickMatchIdle();
}

final class QuickMatchActive extends QuickMatchState {
  const QuickMatchActive(this.search, {this.exchangeRates = const []});
  final QuickMatchSearchDto search;

  /// Tasas del día para mostrar el precio dual (USD + Bs) en las propuestas
  /// — mismo patrón que `DiscoverMatchesLoaded.exchangeRates`.
  final List<ExchangeRateRow> exchangeRates;

  @override
  List<Object?> get props => [search.id, search.status, search.noMatchYet];
}

final class QuickMatchFailure extends QuickMatchState {
  const QuickMatchFailure(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}
