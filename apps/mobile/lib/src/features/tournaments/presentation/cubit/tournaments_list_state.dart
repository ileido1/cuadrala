import 'package:equatable/equatable.dart';

import '../../data/models/tournament_list_item_dto.dart';
import '../../data/tournaments_api.dart';

sealed class TournamentsListState extends Equatable {
  const TournamentsListState();

  @override
  List<Object?> get props => [];
}

final class TournamentsListInitial extends TournamentsListState {
  const TournamentsListInitial();
}

final class TournamentsListLoading extends TournamentsListState {
  const TournamentsListLoading();
}

final class TournamentsListLoaded extends TournamentsListState {
  const TournamentsListLoaded({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.isLoadingMore,
    required this.hasReachedEnd,
    required this.filters,
  });

  final List<TournamentListItemDto> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;
  final TournamentListFilters filters;

  TournamentsListLoaded copyWith({
    List<TournamentListItemDto>? items,
    int? page,
    int? limit,
    int? total,
    bool? isLoadingMore,
    bool? hasReachedEnd,
    TournamentListFilters? filters,
  }) {
    return TournamentsListLoaded(
      items: items ?? this.items,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasReachedEnd: hasReachedEnd ?? this.hasReachedEnd,
      filters: filters ?? this.filters,
    );
  }

  @override
  List<Object?> get props =>
      [items, page, limit, total, isLoadingMore, hasReachedEnd, filters];
}

final class TournamentsListFailure extends TournamentsListState {
  const TournamentsListFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
