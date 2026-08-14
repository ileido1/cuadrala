import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/location/location_service.dart';
import '../../../../core/storage/saved_zones_repository.dart';
import '../../data/models/venue_dto.dart';
import '../../data/venues_repository.dart';
import 'venue_map_state.dart';

class VenueMapCubit extends Cubit<VenueMapState> {
  VenueMapCubit({
    required VenuesRepository repository,
    required LocationService locationService,
    required SavedZonesRepository zonesRepository,
  })  : _repository = repository,
        _locationService = locationService,
        _zonesRepository = zonesRepository,
        super(const VenueMapState());

  final VenuesRepository _repository;
  final LocationService _locationService;
  final SavedZonesRepository _zonesRepository;

  /// Loads saved zones from storage, then loads venues.
  Future<void> load({int radiusKm = 25}) async {
    emit(state.copyWith(status: VenueMapStatus.loading, fellBackToAll: false));

    // Load saved zones first
    List<SavedZone> savedZones;
    try {
      savedZones = await _zonesRepository.listZones();
    } catch (_) {
      savedZones = [];
    }

    // Determine coordinates to search near
    double? lat;
    double? lng;
    String? near;

    // If a saved zone is selected, use its coordinates
    if (state.selectedZone != null) {
      lat = state.selectedZone!.latitude;
      lng = state.selectedZone!.longitude;
      near = state.selectedZone!.nearParam;
    } else {
      // Try GPS
      try {
        final pos = await _locationService.getCurrentLocation();
        lat = pos.latitude;
        lng = pos.longitude;
        near = '${pos.latitude},${pos.longitude}';
      } on LocationFailure {
        // Graceful fallback — proceed without GPS coords.
      } catch (_) {
        // Any unexpected location error also falls back gracefully.
      }
    }

    try {
      final all = await _repository.listVenues(
        near: near,
        radiusKm: near != null ? (state.selectedZone?.radiusKm ?? radiusKm) : null,
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
          userLat: lat,
          userLng: lng,
          selectedVenue: null,
          error: null,
          fellBackToAll: fellBack,
          savedZones: savedZones,
        ),
      );
    } on AppFailure catch (e) {
      emit(state.copyWith(
        status: VenueMapStatus.failure,
        error: e.message,
        savedZones: savedZones,
      ));
    } catch (_) {
      emit(
        state.copyWith(
          status: VenueMapStatus.failure,
          error: 'No pudimos cargar las sedes.',
          savedZones: savedZones,
        ),
      );
    }
  }

  /// Loads saved zones from storage and updates state.
  Future<void> loadSavedZones() async {
    try {
      final zones = await _zonesRepository.listZones();
      emit(state.copyWith(savedZones: zones));
    } catch (_) {
      // Silently fail
    }
  }

  /// Selects a saved zone and reloads venues near it.
  /// Pass null to deselect and use GPS.
  Future<void> selectZone(SavedZone? zone) async {
    emit(state.copyWith(selectedZone: zone, radiusKm: zone?.radiusKm ?? 25));
    await load();
  }

  /// Saves the current GPS position as a new zone with the given name.
  Future<void> saveCurrentLocationAsZone({
    required String name,
    required int radiusKm,
  }) async {
    try {
      final pos = await _locationService.getCurrentLocation();
      await _zonesRepository.saveZone(
        name: name,
        latitude: pos.latitude,
        longitude: pos.longitude,
        radiusKm: radiusKm,
      );
      await loadSavedZones();
    } on LocationFailure catch (e) {
      emit(state.copyWith(error: 'No pudimos obtener tu ubicación: ${e.message}'));
    } catch (_) {
      emit(state.copyWith(error: 'No pudimos guardar la zona.'));
    }
  }

  /// Deletes a saved zone by id.
  Future<void> deleteZone(String id) async {
    try {
      await _zonesRepository.deleteZone(id);
      // If we deleted the currently selected zone, deselect it
      if (state.selectedZone?.id == id) {
        emit(state.copyWith(selectedZone: null));
      }
      await loadSavedZones();
    } catch (_) {
      // Silently fail
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
