import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/location/location_service.dart';
import '../../../catalog/data/catalog_repository.dart';
import '../../../catalog/data/models/category_dto.dart';
import '../../../catalog/data/models/sport_dto.dart';
import '../../../onboarding/data/onboarding_repository.dart';
import '../../../profile/data/profile_repository.dart';
import '../../../venues/data/models/venue_dto.dart';
import '../../../venues/data/venues_repository.dart';
import '../../data/models/viewer_tournament_dto.dart';
import '../../data/tournaments_api.dart';
import '../../data/tournaments_repository.dart';
import 'tournaments_list_state.dart';

final class TournamentsListCubit extends Cubit<TournamentsListState> {
  TournamentsListCubit({
    required TournamentsRepository tournamentsRepository,
    required CatalogRepository catalogRepository,
    required VenuesRepository venuesRepository,
    required ProfileRepository profileRepository,
    OnboardingRepository? onboardingRepository,
    LocationService? locationService,
    TournamentListFilters? initialFilters,
  })  : _tournamentsRepository = tournamentsRepository,
        _catalogRepository = catalogRepository,
        _venuesRepository = venuesRepository,
        _profileRepository = profileRepository,
        _onboardingRepository = onboardingRepository,
        _locationService = locationService,
        _currentFilters = initialFilters ?? const TournamentListFilters(),
        super(const TournamentsListInitial());

  final TournamentsRepository _tournamentsRepository;
  final CatalogRepository _catalogRepository;
  final VenuesRepository _venuesRepository;
  final ProfileRepository _profileRepository;

  /// Ubicación guardada del visor (`OnboardingRepository.getLocation()`,
  /// premisa (c) del design). `null` cuando la screen no la inyectó — el
  /// chip "Cerca" cae directo al fallback de GPS en ese caso.
  final OnboardingRepository? _onboardingRepository;

  /// Fallback de GPS cuando no hay ubicación guardada. `null` con el mismo
  /// criterio que [_onboardingRepository].
  final LocationService? _locationService;
  TournamentListFilters _currentFilters;

  /// Radio fijo del chip "Cerca" (M3d, `sdd/tournaments-handoff-fidelity`).
  static const _nearRadiusKm = 10;
  List<SportDto> _sports = [];
  List<CategoryDto> _categories = [];
  List<VenueDto> _venues = [];
  bool _hasOwnCategory = false;
  String? _ownCategoryId;
  String? _ownCategoryLabel;
  bool _appliedOwnCategoryDefault = false;
  static const _pageLimit = 20;

  /// "Mis torneos" (M4a): torneos donde el visor está inscripto, invitado, o
  /// que organiza. Se recarga en cada [load] (incluye pull-to-refresh); una
  /// falla la deja vacía sin romper el resto del listado.
  List<ViewerTournamentDto> _myTournaments = [];

  /// Primera vez que se carga: si el visor tiene categoría propia (rating
  /// primario) y todavía no hay un filtro de categoría explícito, la usa
  /// como default. Una sola vez por cubit — nunca pisa un filtro que el
  /// usuario ya tocó a mano (`applyFilters`/`clearFilters`) en una carga
  /// posterior.
  Future<void> _applyOwnCategoryDefaultIfNeededSV() async {
    if (_appliedOwnCategoryDefault) return;
    _appliedOwnCategoryDefault = true;
    try {
      final me = await _profileRepository.getMe();
      final categoryId = me.primaryRating?.categoryId;
      _hasOwnCategory = categoryId != null;
      _ownCategoryId = categoryId;
      _ownCategoryLabel = me.primaryRating?.categoryName;
      if (categoryId != null && _currentFilters.categoryId == null) {
        _currentFilters = _currentFilters.copyWith(categoryId: categoryId);
      }
    } catch (_) {
      // Silently fail - el listado funciona igual sin default de categoría.
    }
  }

  /// "Mis torneos" (M4a): trae los torneos del visor. Una falla los deja
  /// vacíos — el listado principal ("Abiertos") funciona igual sin esto.
  Future<void> _loadMyTournamentsSV() async {
    try {
      _myTournaments = await _tournamentsRepository.listMyTournaments();
    } catch (_) {
      _myTournaments = [];
    }
  }

  Future<void> load() async {
    await _applyOwnCategoryDefaultIfNeededSV();
    await _loadMyTournamentsSV();
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
        hasOwnCategory: _hasOwnCategory,
        ownCategoryId: _ownCategoryId,
        ownCategoryLabel: _ownCategoryLabel,
        myTournaments: _myTournaments,
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
        hasOwnCategory: _hasOwnCategory,
        ownCategoryId: _ownCategoryId,
        ownCategoryLabel: _ownCategoryLabel,
        myTournaments: _myTournaments,
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

  /// Chip "Cerca": activa/desactiva el filtro `near`/`radiusKm`.
  ///
  /// Al activar, resuelve la ubicación en este orden: guardada
  /// (`OnboardingRepository.getLocation()`) y, si no hay, GPS
  /// (`LocationService.getCurrentLocation()`). Si ninguna resuelve, el chip
  /// queda inactivo — no se manda un filtro roto ni se inventa una posición.
  Future<void> toggleNear() async {
    final current = state;
    if (current is! TournamentsListLoaded) return;

    if (current.filters.near != null) {
      await applyFilters(current.filters.copyWith(clearNear: true));
      return;
    }

    final near = await _resolveNearParamSV();
    if (near == null) return;

    await applyFilters(
      current.filters.copyWith(near: near, radiusKm: _nearRadiusKm),
    );
  }

  Future<String?> _resolveNearParamSV() async {
    if (_onboardingRepository != null) {
      try {
        final saved = await _onboardingRepository.getLocation();
        if (saved != null) {
          return '${saved.latitude},${saved.longitude}';
        }
      } catch (_) {
        // Silently fail - cae al GPS.
      }
    }

    if (_locationService != null) {
      try {
        final pos = await _locationService.getCurrentLocation();
        return '${pos.latitude},${pos.longitude}';
      } catch (_) {
        // Silently fail - ni ubicación guardada ni GPS: el chip queda inactivo.
      }
    }

    return null;
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
