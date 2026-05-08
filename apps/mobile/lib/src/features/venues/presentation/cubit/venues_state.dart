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

final class VenuesLoaded extends VenuesState {
  const VenuesLoaded({required this.venues});

  final List<VenueDto> venues;

  @override
  List<Object?> get props => [venues];
}
