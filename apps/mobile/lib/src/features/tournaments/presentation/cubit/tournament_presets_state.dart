import 'package:equatable/equatable.dart';

import '../../data/models/tournament_preset_dto.dart';

sealed class TournamentPresetsState extends Equatable {
  const TournamentPresetsState();

  @override
  List<Object?> get props => [];
}

final class TournamentPresetsInitial extends TournamentPresetsState {
  const TournamentPresetsInitial();
}

final class TournamentPresetsLoading extends TournamentPresetsState {
  const TournamentPresetsLoading();
}

final class TournamentPresetsEmpty extends TournamentPresetsState {
  const TournamentPresetsEmpty();
}

final class TournamentPresetsSuccess extends TournamentPresetsState {
  const TournamentPresetsSuccess({required this.presets});

  final List<TournamentPresetDto> presets;

  @override
  List<Object?> get props => [presets];
}

final class TournamentPresetsError extends TournamentPresetsState {
  const TournamentPresetsError({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

