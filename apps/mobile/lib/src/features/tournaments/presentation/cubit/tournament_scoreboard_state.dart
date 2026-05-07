import 'package:equatable/equatable.dart';

import '../../data/models/tournament_scoreboard_dto.dart';

sealed class TournamentScoreboardState extends Equatable {
  const TournamentScoreboardState();

  @override
  List<Object?> get props => [];
}

final class TournamentScoreboardInitial extends TournamentScoreboardState {
  const TournamentScoreboardInitial();
}

final class TournamentScoreboardLoading extends TournamentScoreboardState {
  const TournamentScoreboardLoading();
}

final class TournamentScoreboardEmpty extends TournamentScoreboardState {
  const TournamentScoreboardEmpty();
}

final class TournamentScoreboardSuccess extends TournamentScoreboardState {
  const TournamentScoreboardSuccess({required this.scoreboard});

  final TournamentScoreboardDto scoreboard;

  @override
  List<Object?> get props => [scoreboard];
}

final class TournamentScoreboardError extends TournamentScoreboardState {
  const TournamentScoreboardError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

