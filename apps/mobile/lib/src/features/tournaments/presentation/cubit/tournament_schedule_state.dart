import 'package:equatable/equatable.dart';

import '../../data/models/tournament_schedule_dto.dart';

sealed class TournamentScheduleState extends Equatable {
  const TournamentScheduleState();

  @override
  List<Object?> get props => [];
}

final class TournamentScheduleInitial extends TournamentScheduleState {
  const TournamentScheduleInitial();
}

final class TournamentScheduleLoading extends TournamentScheduleState {
  const TournamentScheduleLoading();
}

final class TournamentScheduleGenerating extends TournamentScheduleState {
  const TournamentScheduleGenerating();
}

final class TournamentScheduleEmpty extends TournamentScheduleState {
  const TournamentScheduleEmpty();
}

final class TournamentScheduleUnsupported extends TournamentScheduleState {
  const TournamentScheduleUnsupported();
}

final class TournamentScheduleConflict extends TournamentScheduleState {
  const TournamentScheduleConflict();
}

final class TournamentScheduleSuccess extends TournamentScheduleState {
  const TournamentScheduleSuccess({required this.schedule});

  final TournamentScheduleDto schedule;

  @override
  List<Object?> get props => [schedule];
}

final class TournamentScheduleError extends TournamentScheduleState {
  const TournamentScheduleError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

