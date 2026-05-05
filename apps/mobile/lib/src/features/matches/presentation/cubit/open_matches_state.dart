import 'package:equatable/equatable.dart';

import '../../data/models/open_match_dto.dart';

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
    required this.onlyToday,
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
  final bool onlyToday;
  final String? categoryId;
  final List<OpenMatchDto> items;
  final List<OpenMatchDto> visibleItems;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;

  @override
  List<Object?> get props => [
        sportId,
        query,
        onlyToday,
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
