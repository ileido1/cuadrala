import 'package:equatable/equatable.dart';

import '../../data/models/matchmaking_suggestion_dto.dart';

sealed class MatchmakingState extends Equatable {
  const MatchmakingState();

  @override
  List<Object?> get props => [];
}

final class MatchmakingInitial extends MatchmakingState {
  const MatchmakingInitial();
}

final class MatchmakingLoading extends MatchmakingState {
  const MatchmakingLoading();
}

final class MatchmakingFailure extends MatchmakingState {
  const MatchmakingFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class MatchmakingLoaded extends MatchmakingState {
  const MatchmakingLoaded({required this.suggestions});

  final List<MatchmakingSuggestionDto> suggestions;

  @override
  List<Object?> get props => [suggestions];
}
