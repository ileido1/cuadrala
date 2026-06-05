import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';
import '../../../matches/data/models/open_match_dto.dart';

/// Segmento del tab Partidas (handoff: Próximas vs Historial).
enum PartidasSegment { upcoming, history }

sealed class OpenMatchesState extends Equatable {
  const OpenMatchesState();

  @override
  List<Object?> get props => [];
}

final class OpenMatchesInitial extends OpenMatchesState {
  const OpenMatchesInitial();
}

final class OpenMatchesLoading extends OpenMatchesState {
  const OpenMatchesLoading();
}

final class OpenMatchesLoaded extends OpenMatchesState {
  const OpenMatchesLoaded({
    required this.segment,
    required this.items,
    required this.visibleItems,
    required this.page,
    required this.limit,
    required this.total,
    required this.isLoadingMore,
    required this.hasReachedEnd,
    this.exchangeRates = const [],
  });

  final PartidasSegment segment;
  final List<OpenMatchDto> items;
  final List<OpenMatchDto> visibleItems;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;
  final List<ExchangeRateRow> exchangeRates;

  OpenMatchesLoaded copyWith({
    PartidasSegment? segment,
    List<OpenMatchDto>? items,
    List<OpenMatchDto>? visibleItems,
    int? page,
    int? limit,
    int? total,
    bool? isLoadingMore,
    bool? hasReachedEnd,
    List<ExchangeRateRow>? exchangeRates,
  }) {
    return OpenMatchesLoaded(
      segment: segment ?? this.segment,
      items: items ?? this.items,
      visibleItems: visibleItems ?? this.visibleItems,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasReachedEnd: hasReachedEnd ?? this.hasReachedEnd,
      exchangeRates: exchangeRates ?? this.exchangeRates,
    );
  }

  @override
  List<Object?> get props => [
        segment,
        items,
        visibleItems,
        page,
        limit,
        total,
        isLoadingMore,
        hasReachedEnd,
        exchangeRates,
      ];
}

final class OpenMatchesFailure extends OpenMatchesState {
  const OpenMatchesFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

