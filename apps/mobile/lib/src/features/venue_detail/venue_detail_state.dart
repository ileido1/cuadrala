import 'package:equatable/equatable.dart';

import '../venues/data/models/court_dto.dart';
import '../venues/data/models/venue_dto.dart';

sealed class VenueDetailState extends Equatable {
  const VenueDetailState();
  @override
  List<Object?> get props => [];
}

class VenueDetailInitial extends VenueDetailState {
  const VenueDetailInitial();
}

class VenueDetailLoading extends VenueDetailState {
  const VenueDetailLoading();
}

class VenueDetailLoaded extends VenueDetailState {
  const VenueDetailLoaded({required this.venue, required this.courts});

  final VenueDto venue;
  final List<CourtDto> courts;

  @override
  List<Object?> get props => [venue, courts];
}

class VenueDetailEmpty extends VenueDetailState {
  const VenueDetailEmpty();
}

class VenueDetailError extends VenueDetailState {
  const VenueDetailError({required this.message});
  final String message;
  @override
  List<Object?> get props => [message];
}
