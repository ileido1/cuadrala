import 'package:equatable/equatable.dart';

import '../../data/models/tournament_registration_dto.dart';

sealed class TournamentRegistrationsState extends Equatable {
  const TournamentRegistrationsState();

  @override
  List<Object?> get props => [];
}

final class TournamentRegistrationsInitial extends TournamentRegistrationsState {
  const TournamentRegistrationsInitial();
}

final class TournamentRegistrationsLoading extends TournamentRegistrationsState {
  const TournamentRegistrationsLoading();
}

final class TournamentRegistrationsFailure extends TournamentRegistrationsState {
  const TournamentRegistrationsFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class TournamentRegistrationsLoaded extends TournamentRegistrationsState {
  const TournamentRegistrationsLoaded({
    required this.items,
    required this.total,
    this.registering = false,
    this.registerError,
  });

  final List<TournamentRegistrationDto> items;
  final int total;
  final bool registering;
  final String? registerError;

  bool isUserRegistered(String userId) {
    return items.any((r) => r.userId == userId && r.status != 'WITHDRAWN');
  }

  @override
  List<Object?> get props => [items, total, registering, registerError];
}
