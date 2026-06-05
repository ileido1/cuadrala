import 'package:equatable/equatable.dart';

import '../../../../core/formatting/money_conversion.dart';
import '../../data/models/open_match_dto.dart';

enum TimeBucket { morning, afternoon, evening }

sealed class DiscoverMatchesState extends Equatable {
  const DiscoverMatchesState();

  @override
  List<Object?> get props => [];
}

final class DiscoverMatchesInitial extends DiscoverMatchesState {
  const DiscoverMatchesInitial();
}

final class DiscoverMatchesLoading extends DiscoverMatchesState {
  const DiscoverMatchesLoading();
}

final class DiscoverMatchesLoaded extends DiscoverMatchesState {
  const DiscoverMatchesLoaded({
    required this.sportId,
    required this.query,
    required this.selectedDate,
    required this.activeTimeBuckets,
    required this.onlyAvailable,
    required this.categoryId,
    required this.gender,
    required this.venueId,
    required this.items,
    required this.visibleItems,
    required this.page,
    required this.limit,
    required this.total,
    required this.isLoadingMore,
    required this.hasReachedEnd,
    this.exchangeRates = const [],
  });

  final String sportId;
  final String query;
  final DateTime? selectedDate;
  final Set<TimeBucket> activeTimeBuckets;
  final bool onlyAvailable;
  final String? categoryId;
  final String? gender;
  final String? venueId;
  final List<OpenMatchDto> items;
  final List<OpenMatchDto> visibleItems;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;
  final List<ExchangeRateRow> exchangeRates;

  DiscoverMatchesLoaded copyWith({
    String? sportId,
    String? query,
    Object? selectedDate = _sentinel,
    Set<TimeBucket>? activeTimeBuckets,
    bool? onlyAvailable,
    Object? categoryId = _sentinel,
    Object? gender = _sentinel,
    Object? venueId = _sentinel,
    List<OpenMatchDto>? items,
    List<OpenMatchDto>? visibleItems,
    int? page,
    int? limit,
    int? total,
    bool? isLoadingMore,
    bool? hasReachedEnd,
    List<ExchangeRateRow>? exchangeRates,
  }) {
    return DiscoverMatchesLoaded(
      sportId: sportId ?? this.sportId,
      query: query ?? this.query,
      selectedDate: selectedDate == _sentinel ? this.selectedDate : selectedDate as DateTime?,
      activeTimeBuckets: activeTimeBuckets ?? this.activeTimeBuckets,
      onlyAvailable: onlyAvailable ?? this.onlyAvailable,
      categoryId: categoryId == _sentinel ? this.categoryId : categoryId as String?,
      gender: gender == _sentinel ? this.gender : gender as String?,
      venueId: venueId == _sentinel ? this.venueId : venueId as String?,
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
        sportId,
        query,
        selectedDate,
        activeTimeBuckets,
        onlyAvailable,
        categoryId,
        gender,
        venueId,
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

final class DiscoverMatchesFailure extends DiscoverMatchesState {
  const DiscoverMatchesFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

// Sentinel object for nullable copyWith parameters
const Object _sentinel = Object();
