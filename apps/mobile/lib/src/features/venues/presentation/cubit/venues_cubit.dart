import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../../core/location/location_service.dart';
import '../../data/models/venue_dto.dart';
import '../../data/venues_repository.dart';
import 'venues_state.dart';

final class VenuesCubit extends Cubit<VenuesState> {
  VenuesCubit({
    required VenuesRepository repository,
    LocationService? locationService,
  })  : _repository = repository,
        _locationService = locationService,
        super(const VenuesInitial());

  final VenuesRepository _repository;
  final LocationService? _locationService;

  /// Original load: no GPS. Preserved for backward compatibility.
  Future<void> load({String? near, int? radiusKm}) async {
    emit(const VenuesLoading());
    try {
      final venues = await _repository.listVenues(near: near, radiusKm: radiusKm);
      emit(VenuesLoaded(venues: venues, allVenues: venues));
    } on AppFailure catch (e) {
      emit(VenuesFailure(message: e.message));
    } catch (_) {
      emit(const VenuesFailure(message: 'No se pudieron cargar las sedes.'));
    }
  }

  /// Load with GPS. Requests permission via [LocationService]; falls back to
  /// no-proximity sort if permission is denied or GPS is unavailable.
  Future<void> loadWithGps({int radiusKm = 15}) async {
    emit(const VenuesLoading());

    double? userLat;
    double? userLng;
    String? near;

    if (_locationService != null) {
      try {
        final pos = await _locationService.getCurrentLocation();
        userLat = pos.latitude;
        userLng = pos.longitude;
        near = '${pos.latitude},${pos.longitude}';
      } on LocationFailure {
        // Graceful fallback: proceed without GPS coords.
      } catch (_) {
        // Any unexpected error also falls back gracefully.
      }
    }

    try {
      final venues = await _repository.listVenues(
        near: near,
        radiusKm: near != null ? radiusKm : null,
      );
      emit(
        VenuesLoaded(
          venues: venues,
          allVenues: venues,
          userLat: userLat,
          userLng: userLng,
        ),
      );
    } on AppFailure catch (e) {
      emit(VenuesFailure(message: e.message));
    } catch (_) {
      emit(const VenuesFailure(message: 'No se pudieron cargar las sedes.'));
    }
  }

  /// Client-side search: filters [VenuesLoaded.allVenues] by name and address.
  void setSearch(String query) {
    final current = state;
    if (current is! VenuesLoaded) return;
    final filtered = _applyFilters(
      current.allVenues,
      searchQuery: query,
      selectedSport: current.selectedSport,
      indoorOnly: current.indoorOnly,
    );
    emit(current.copyWith(venues: filtered, searchQuery: query));
  }

  /// Client-side sport filter. Pass null to clear.
  void setSport(String? sport) {
    final current = state;
    if (current is! VenuesLoaded) return;
    final filtered = _applyFilters(
      current.allVenues,
      searchQuery: current.searchQuery,
      selectedSport: sport,
      indoorOnly: current.indoorOnly,
    );
    emit(current.copyWith(venues: filtered, selectedSport: sport));
  }

  /// Client-side indoor toggle.
  void setIndoor(bool indoorOnly) {
    final current = state;
    if (current is! VenuesLoaded) return;
    final filtered = _applyFilters(
      current.allVenues,
      searchQuery: current.searchQuery,
      selectedSport: current.selectedSport,
      indoorOnly: indoorOnly,
    );
    emit(current.copyWith(venues: filtered, indoorOnly: indoorOnly));
  }

  List<VenueDto> _applyFilters(
    List<VenueDto> all, {
    required String searchQuery,
    required String? selectedSport,
    required bool indoorOnly,
  }) {
    var result = all;

    if (searchQuery.isNotEmpty) {
      final q = searchQuery.toLowerCase();
      result = result.where((v) {
        final nameMatch = v.name.toLowerCase().contains(q);
        final addressMatch = v.address?.toLowerCase().contains(q) ?? false;
        return nameMatch || addressMatch;
      }).toList();
    }

    if (selectedSport != null) {
      result = result.where((v) => v.sports.contains(selectedSport)).toList();
    }

    // indoorOnly: VenueDto doesn't carry indoor-court info at list level.
    // State is tracked but filtering is a no-op until the API exposes it.
    // The flag is persisted so the UI can display it correctly.

    return result;
  }
}
