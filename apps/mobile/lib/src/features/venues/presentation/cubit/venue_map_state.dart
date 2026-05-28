import 'package:equatable/equatable.dart';

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
  });

  final VenueMapStatus status;
  final List<VenueDto> venues;
  final List<VenueDto> filtered;
  final String searchQuery;
  final double? userLat;
  final double? userLng;
  final VenueDto? selectedVenue;
  final String? error;

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
    );
  }

  @override
  List<Object?> get props =>
      [status, venues, filtered, searchQuery, userLat, userLng, selectedVenue, error];
}
