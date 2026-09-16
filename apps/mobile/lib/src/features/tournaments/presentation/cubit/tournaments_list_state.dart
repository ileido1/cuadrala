import 'package:equatable/equatable.dart';

import '../../data/models/tournament_list_item_dto.dart';
import '../../data/models/viewer_tournament_dto.dart';
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
    this.hasOwnCategory = false,
    this.ownCategoryId,
    this.ownCategoryLabel,
    this.myTournaments = const [],
  });

  final List<TournamentListItemDto> items;
  final int page;
  final int limit;
  final int total;
  final bool isLoadingMore;
  final bool hasReachedEnd;
  final TournamentListFilters filters;

  /// El visor tiene una categoría propia (rating primario). Cuando es
  /// `false` el chip "Mi categoría" no debe dibujarse — no hay nada que
  /// filtrar por default.
  final bool hasOwnCategory;

  /// `categoryId` del rating primario del visor. `null` cuando
  /// [hasOwnCategory] es `false`. Usado para reaplicar el filtro al
  /// re-seleccionar el chip "Mi categoría" tras haberlo destildado.
  final String? ownCategoryId;

  /// Nombre de la categoría propia del visor (ej. "7ma"), usado para
  /// renderizar el copy verbatim "Mi categoría {N}" (`cuadrala-torneos.jsx:188`).
  final String? ownCategoryLabel;

  /// "Mis torneos" (M4a): torneos donde el visor está inscrito, invitado, o
  /// que organiza, sourced de `GET /api/v1/users/me/tournaments`. Vacío
  /// mientras carga o si la llamada falla — nunca inventado.
  final List<ViewerTournamentDto> myTournaments;

  TournamentsListLoaded copyWith({
    List<TournamentListItemDto>? items,
    int? page,
    int? limit,
    int? total,
    bool? isLoadingMore,
    bool? hasReachedEnd,
    TournamentListFilters? filters,
    bool? hasOwnCategory,
    String? ownCategoryId,
    String? ownCategoryLabel,
    List<ViewerTournamentDto>? myTournaments,
  }) {
    return TournamentsListLoaded(
      items: items ?? this.items,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasReachedEnd: hasReachedEnd ?? this.hasReachedEnd,
      filters: filters ?? this.filters,
      hasOwnCategory: hasOwnCategory ?? this.hasOwnCategory,
      ownCategoryId: ownCategoryId ?? this.ownCategoryId,
      ownCategoryLabel: ownCategoryLabel ?? this.ownCategoryLabel,
      myTournaments: myTournaments ?? this.myTournaments,
    );
  }

  @override
  List<Object?> get props => [
        items,
        page,
        limit,
        total,
        isLoadingMore,
        hasReachedEnd,
        filters,
        hasOwnCategory,
        ownCategoryId,
        ownCategoryLabel,
        myTournaments,
      ];
}

final class TournamentsListFailure extends TournamentsListState {
  const TournamentsListFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}
