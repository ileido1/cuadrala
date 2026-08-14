import 'package:equatable/equatable.dart';

import '../../../../core/storage/saved_zones_repository.dart';
import '../../data/models/venue_dto.dart';

enum VenueMapStatus { initial, loading, loaded, failure }

final class VenueMapState extends Equatable {
  const VenueMapState({
    this.status = VenueMapStatus.initial,
    this.venues = const [],
    this.filtered = const [],
    this.searchQuery = '',
    this.userLat,
    this.userLng,
    this.selectedVenue,
    this.error,
    this.fellBackToAll = false,
    this.savedZones = const [],
    this.selectedZone,
    this.radiusKm = 25,
    this.sportType,
  });

  final VenueMapStatus status;
  final List<VenueDto> venues;
  final List<VenueDto> filtered;
  final String searchQuery;
  final double? userLat;
  final double? userLng;
  final VenueDto? selectedVenue;
  final String? error;

  /// True cuando la búsqueda por cercanía no halló sedes y se cayó a la lista
  /// completa (sin `near`). La UI lo usa para avisar "mostrando todas".
  final bool fellBackToAll;

  /// Zonas guardadas del usuario.
  final List<SavedZone> savedZones;

  /// Zona actualmente seleccionada (null = usar GPS actual).
  final SavedZone? selectedZone;

  /// Radio de búsqueda en km.
  final int radiusKm;

  /// Filtro de deporte activo (null = Todos, 'PADEL', 'TENNIS').
  final String? sportType;

  static const _sentinel = Object();

  VenueMapState copyWith({
    VenueMapStatus? status,
    List<VenueDto>? venues,
    List<VenueDto>? filtered,
    String? searchQuery,
    Object? userLat = _sentinel,
    Object? userLng = _sentinel,
    Object? selectedVenue = _sentinel,
    Object? error = _sentinel,
    bool? fellBackToAll,
    List<SavedZone>? savedZones,
    Object? selectedZone = _sentinel,
    int? radiusKm,
    Object? sportType = _sentinel,
  }) {
    return VenueMapState(
      status: status ?? this.status,
      venues: venues ?? this.venues,
      filtered: filtered ?? this.filtered,
      searchQuery: searchQuery ?? this.searchQuery,
      userLat: userLat == _sentinel ? this.userLat : userLat as double?,
      userLng: userLng == _sentinel ? this.userLng : userLng as double?,
      selectedVenue:
          selectedVenue == _sentinel ? this.selectedVenue : selectedVenue as VenueDto?,
      error: error == _sentinel ? this.error : error as String?,
      fellBackToAll: fellBackToAll ?? this.fellBackToAll,
      savedZones: savedZones ?? this.savedZones,
      selectedZone:
          selectedZone == _sentinel ? this.selectedZone : selectedZone as SavedZone?,
      radiusKm: radiusKm ?? this.radiusKm,
      sportType: sportType == _sentinel ? this.sportType : sportType as String?,
    );
  }

  @override
  List<Object?> get props => [
        status,
        venues,
        filtered,
        searchQuery,
        userLat,
        userLng,
        selectedVenue,
        error,
        fellBackToAll,
        savedZones,
        selectedZone,
        radiusKm,
        sportType,
      ];
}
