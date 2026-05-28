import 'package:equatable/equatable.dart';

import '../../data/models/venue_dto.dart';

sealed class VenuesState extends Equatable {
  const VenuesState();

  @override
  List<Object?> get props => [];
}

final class VenuesInitial extends VenuesState {
  const VenuesInitial();
}

final class VenuesLoading extends VenuesState {
  const VenuesLoading();
}

final class VenuesFailure extends VenuesState {
  const VenuesFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

/// Sentinel for copyWith: distinguishes "caller passed null intentionally"
/// from "caller omitted the argument". Same pattern used for categoryId/gender.
const _kSentinel = Object();

final class VenuesLoaded extends VenuesState {
  const VenuesLoaded({
    required this.venues,
    this.allVenues = const [],
    this.searchQuery = '',
    this.selectedSport,
    this.indoorOnly = false,
    this.userLat,
    this.userLng,
  });

  /// Filtered/visible list (what the UI renders).
  final List<VenueDto> venues;

  /// Unfiltered list from the API (used for client-side filtering).
  final List<VenueDto> allVenues;

  final String searchQuery;
  final String? selectedSport;
  final bool indoorOnly;
  final double? userLat;
  final double? userLng;

  VenuesLoaded copyWith({
    List<VenueDto>? venues,
    List<VenueDto>? allVenues,
    String? searchQuery,
    Object? selectedSport = _kSentinel,
    bool? indoorOnly,
    Object? userLat = _kSentinel,
    Object? userLng = _kSentinel,
  }) {
    return VenuesLoaded(
      venues: venues ?? this.venues,
      allVenues: allVenues ?? this.allVenues,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedSport: identical(selectedSport, _kSentinel)
          ? this.selectedSport
          : selectedSport as String?,
      indoorOnly: indoorOnly ?? this.indoorOnly,
      userLat: identical(userLat, _kSentinel) ? this.userLat : userLat as double?,
      userLng: identical(userLng, _kSentinel) ? this.userLng : userLng as double?,
    );
  }

  @override
  List<Object?> get props => [
        venues,
        allVenues,
        searchQuery,
        selectedSport,
        indoorOnly,
        userLat,
        userLng,
      ];
}
