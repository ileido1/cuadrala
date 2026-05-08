import 'package:equatable/equatable.dart';

import '../../data/models/court_dto.dart';

sealed class VenueDetailState extends Equatable {
  const VenueDetailState();

  @override
  List<Object?> get props => [];
}

final class VenueDetailInitial extends VenueDetailState {
  const VenueDetailInitial();
}

final class VenueDetailLoading extends VenueDetailState {
  const VenueDetailLoading();
}

final class VenueDetailFailure extends VenueDetailState {
  const VenueDetailFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class VenueDetailLoaded extends VenueDetailState {
  const VenueDetailLoaded({required this.courts});

  final List<CourtDto> courts;

  @override
  List<Object?> get props => [courts];
}
