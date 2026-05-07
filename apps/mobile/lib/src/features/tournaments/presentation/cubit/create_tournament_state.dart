import 'package:equatable/equatable.dart';

sealed class CreateTournamentState extends Equatable {
  const CreateTournamentState();

  @override
  List<Object?> get props => [];
}

final class CreateTournamentInitial extends CreateTournamentState {
  const CreateTournamentInitial();
}

final class CreateTournamentSubmitting extends CreateTournamentState {
  const CreateTournamentSubmitting();
}

final class CreateTournamentSuccess extends CreateTournamentState {
  const CreateTournamentSuccess({required this.tournamentId});

  final String tournamentId;

  @override
  List<Object?> get props => [tournamentId];
}

final class CreateTournamentError extends CreateTournamentState {
  const CreateTournamentError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

