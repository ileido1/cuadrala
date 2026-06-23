import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/location/location_service.dart';
import '../../data/models/venue_dto.dart';
import '../../data/venues_repository.dart';
import 'venue_map_state.dart';

class VenueMapCubit extends Cubit<VenueMapState> {
  VenueMapCubit({
    required VenuesRepository repository,
    required LocationService locationService,
  })  : _repository = repository,
        _locationService = locationService,
        super(const VenueMapState());

  final VenuesRepository _repository;
  final LocationService _locationService;

  /// Loads venues near the user's GPS position, or all venues if GPS is
  /// unavailable. Venues with null lat/lng are silently excluded.
  Future<void> load({int radiusKm = 25}) async {
    emit(state.copyWith(status: VenueMapStatus.loading, fellBackToAll: false));

    double? userLat;
    double? userLng;
    String? near;

    try {
      final pos = await _locationService.getCurrentLocation();
      userLat = pos.latitude;
      userLng = pos.longitude;
      near = '${pos.latitude},${pos.longitude}';
    } on LocationFailure {
      // Graceful fallback — proceed without GPS coords.
    } catch (_) {
      // Any unexpected location error also falls back gracefully.
    }

    try {
      final all = await _repository.listVenues(
        near: near,
        radiusKm: near != null ? radiusKm : null,
      );

      var withCoords = all
          .where((v) => v.latitude != null && v.longitude != null)
          .toList();
      var fellBack = false;

      // Fallback: si la búsqueda por cercanía no halló sedes, reintentar UNA
      // vez sin `near` (lista completa) para no dejar al usuario sin resultados
      // cuando su ubicación está lejos del catálogo disponible.
      if (near != null && withCoords.isEmpty) {
        final fallback = await _repository.listVenues();
        withCoords = fallback
            .where((v) => v.latitude != null && v.longitude != null)
            .toList();
        fellBack = true;
      }

      emit(
        state.copyWith(
          status: VenueMapStatus.loaded,
          venues: withCoords,
          filtered: withCoords,
          searchQuery: '',
          userLat: userLat,
          userLng: userLng,
          selectedVenue: null,
          error: null,
          fellBackToAll: fellBack,
        ),
      );
    } on AppFailure catch (e) {
      emit(state.copyWith(status: VenueMapStatus.failure, error: e.message));
    } catch (_) {
      emit(
        state.copyWith(
          status: VenueMapStatus.failure,
          error: 'No pudimos cargar las sedes.',
        ),
      );
    }
  }

  /// Client-side filter: filters [venues] by name or address (case-insensitive).
  void search(String query) {
    final q = query.toLowerCase();
    final filtered = q.isEmpty
        ? state.venues
        : state.venues.where((v) {
            final nameMatch = v.name.toLowerCase().contains(q);
            final addressMatch = v.address?.toLowerCase().contains(q) ?? false;
            return nameMatch || addressMatch;
          }).toList();

    emit(state.copyWith(filtered: filtered, searchQuery: query));
  }

  /// Selects a venue to show its mini sheet. Pass null to dismiss.
  void selectVenue(VenueDto? venue) {
    emit(state.copyWith(selectedVenue: venue));
  }
}
