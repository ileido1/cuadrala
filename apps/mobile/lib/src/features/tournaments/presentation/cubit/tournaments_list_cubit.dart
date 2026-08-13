import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournaments_api.dart';
import '../../data/tournaments_repository.dart';
import 'tournaments_list_state.dart';

final class TournamentsListCubit extends Cubit<TournamentsListState> {
  TournamentsListCubit({
    required TournamentsRepository tournamentsRepository,
    TournamentListFilters? initialFilters,
  })  : _tournamentsRepository = tournamentsRepository,
        _currentFilters = initialFilters ?? const TournamentListFilters(),
        super(const TournamentsListInitial());

  final TournamentsRepository _tournamentsRepository;
  TournamentListFilters _currentFilters;
  static const _pageLimit = 20;

  Future<void> load() async {
    emit(const TournamentsListLoading());
    try {
      final page = await _tournamentsRepository.listTournaments(
        page: 1,
        limit: _pageLimit,
        filters: _currentFilters,
      );
      emit(TournamentsListLoaded(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
        isLoadingMore: false,
        hasReachedEnd: page.hasReachedEnd,
        filters: _currentFilters,
      ));
    } on AppFailure catch (e) {
      emit(TournamentsListFailure(message: e.message));
    } catch (e) {
      emit(const TournamentsListFailure(
          message: 'No se pudo cargar el listado de torneos.'));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! TournamentsListLoaded) return;
    if (current.isLoadingMore || current.hasReachedEnd) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.page + 1;
      final page = await _tournamentsRepository.listTournaments(
        page: nextPage,
        limit: current.limit,
        filters: current.filters,
      );
      emit(current.copyWith(
        items: [...current.items, ...page.items],
        page: page.page,
        total: page.total,
        isLoadingMore: false,
        hasReachedEnd: page.hasReachedEnd,
      ));
    } on AppFailure catch (e) {
      emit(current.copyWith(isLoadingMore: false));
      emit(TournamentsListFailure(message: e.message));
    } catch (e) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }

  Future<void> applyFilters(TournamentListFilters filters) async {
    _currentFilters = filters;
    emit(const TournamentsListLoading());
    try {
      final page = await _tournamentsRepository.listTournaments(
        page: 1,
        limit: _pageLimit,
        filters: filters,
      );
      emit(TournamentsListLoaded(
        items: page.items,
        page: page.page,
        limit: page.limit,
        total: page.total,
        isLoadingMore: false,
        hasReachedEnd: page.hasReachedEnd,
        filters: filters,
      ));
    } on AppFailure catch (e) {
      emit(TournamentsListFailure(message: e.message));
    } catch (e) {
      emit(const TournamentsListFailure(
          message: 'No se pudieron aplicar los filtros.'));
    }
  }

  void clearFilters() {
    applyFilters(const TournamentListFilters());
  }
}
