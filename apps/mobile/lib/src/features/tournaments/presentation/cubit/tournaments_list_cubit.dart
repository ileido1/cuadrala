import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/category_dto.dart';
import '../../../catalog/data/models/sport_dto.dart';
import '../../../venues/data/models/venue_dto.dart';
import '../../../venues/data/venues_repository.dart';
import '../../data/tournaments_api.dart';
import '../../data/tournaments_repository.dart';
import 'tournaments_list_state.dart';

final class TournamentsListCubit extends Cubit<TournamentsListState> {
  TournamentsListCubit({
    required TournamentsRepository tournamentsRepository,
    required CatalogRepository catalogRepository,
    required VenuesRepository venuesRepository,
    TournamentListFilters? initialFilters,
  })  : _tournamentsRepository = tournamentsRepository,
        _catalogRepository = catalogRepository,
        _venuesRepository = venuesRepository,
        _currentFilters = initialFilters ?? const TournamentListFilters(),
        super(const TournamentsListInitial());

  final TournamentsRepository _tournamentsRepository;
  final CatalogRepository _catalogRepository;
  final VenuesRepository _venuesRepository;
  TournamentListFilters _currentFilters;
  List<SportDto> _sports = [];
  List<CategoryDto> _categories = [];
  List<VenueDto> _venues = [];
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
    // Reload categories if sport changed
    if (filters.sportId != null && filters.sportId != _currentFilters.sportId) {
      try {
        _categories = await _catalogRepository.listCategories(sportId: filters.sportId);
      } catch (_) {
        _categories = [];
      }
    }
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

  List<SportDto> get sports => _sports;

  List<CategoryDto> get categories => _categories;

  List<VenueDto> get venues => _venues;

  Future<void> loadSportsAndCategories() async {
    try {
      _sports = await _catalogRepository.listSports();
      if (_currentFilters.sportId != null) {
        _categories = await _catalogRepository.listCategories(
          sportId: _currentFilters.sportId,
        );
      }
      // Emit updated state with new sports/categories if already loaded
      final current = state;
      if (current is TournamentsListLoaded) {
        emit(current.copyWith());
      }
    } catch (_) {
      // Silently fail - filters still work without sports/categories
    }
  }

  Future<void> loadCategoriesForSport(String sportId) async {
    try {
      _categories = await _catalogRepository.listCategories(sportId: sportId);
      final current = state;
      if (current is TournamentsListLoaded) {
        emit(current.copyWith());
      }
    } catch (_) {
      // Silently fail
    }
  }

  Future<void> loadVenues() async {
    try {
      _venues = await _venuesRepository.listVenues(page: 1, limit: 50);
      final current = state;
      if (current is TournamentsListLoaded) {
        emit(current.copyWith());
      }
    } catch (_) {
      // Silently fail - filters still work without venues
    }
  }
}
