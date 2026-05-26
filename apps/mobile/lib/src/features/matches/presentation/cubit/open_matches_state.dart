import 'package:equatable/equatable.dart';

import '../../data/models/open_match_dto.dart';

enum TimeBucket { morning, afternoon, evening }

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
    required this.sportId,
    required this.query,
    required this.selectedDate,
    required this.activeTimeBuckets,
    required this.onlyAvailable,
    required this.categoryId,
    required this.items,
    required this.visibleItems,
    required this.page,
    required this.limit,
    required this.total,
    required this.isLoadingMore,
    required this.hasReachedEnd,
  });

  final String sportId;
  final String query;
  final DateTime? selectedDate;
  final Set<TimeBucket> activeTimeBuckets;
  final bool onlyAvailable;
  final String? categoryId;
  final List<OpenMatchDto> items;
  final List<OpenMatchDto> visibleItems;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;

  OpenMatchesLoaded copyWith({
    String? sportId,
    String? query,
    Object? selectedDate = _sentinel,
    Set<TimeBucket>? activeTimeBuckets,
    bool? onlyAvailable,
    Object? categoryId = _sentinel,
    List<OpenMatchDto>? items,
    List<OpenMatchDto>? visibleItems,
    int? page,
    int? limit,
    int? total,
    bool? isLoadingMore,
    bool? hasReachedEnd,
  }) {
    return OpenMatchesLoaded(
      sportId: sportId ?? this.sportId,
      query: query ?? this.query,
      selectedDate: selectedDate == _sentinel ? this.selectedDate : selectedDate as DateTime?,
      activeTimeBuckets: activeTimeBuckets ?? this.activeTimeBuckets,
      onlyAvailable: onlyAvailable ?? this.onlyAvailable,
      categoryId: categoryId == _sentinel ? this.categoryId : categoryId as String?,
      items: items ?? this.items,
      visibleItems: visibleItems ?? this.visibleItems,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasReachedEnd: hasReachedEnd ?? this.hasReachedEnd,
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
        items,
        visibleItems,
        page,
        limit,
        total,
        isLoadingMore,
        hasReachedEnd,
      ];
}

final class OpenMatchesFailure extends OpenMatchesState {
  const OpenMatchesFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

// Sentinel object for nullable copyWith parameters
const Object _sentinel = Object();
