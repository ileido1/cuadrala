import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';
import '../../../matches/data/models/open_match_dto.dart';

sealed class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

final class HomeInitial extends HomeState {
  const HomeInitial();
}

final class HomeLoading extends HomeState {
  const HomeLoading();
}

final class HomeLoaded extends HomeState {
  const HomeLoaded({
    required this.greetingName,
    required this.sportId,
    required this.openMatches,
    required this.myMatches,
    this.levelCategory,
    this.levelElo,
    this.exchangeRates = const [],
  });

  final String greetingName;
  final String sportId;
  final List<OpenMatchDto> openMatches;

  /// Matches where the current user is organizer or participant.
  final List<OpenMatchDto> myMatches;

  /// Etiqueta de categoría del nivel principal (p. ej. `Primera`). `null` si el
  /// jugador aún no tiene ratings.
  final String? levelCategory;

  /// ELO del nivel principal redondeado. `null` si no hay ratings.
  final int? levelElo;

  /// Tasas de cambio para precio dual en tarjetas (Bs secundario).
  final List<ExchangeRateRow> exchangeRates;

  OpenMatchDto? get nextMatch =>
      openMatches.isEmpty ? null : openMatches.first;

  @override
  List<Object?> get props => [
        greetingName,
        sportId,
        openMatches,
        myMatches,
        levelCategory,
        levelElo,
        exchangeRates,
      ];
}

final class HomeFailure extends HomeState {
  const HomeFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
