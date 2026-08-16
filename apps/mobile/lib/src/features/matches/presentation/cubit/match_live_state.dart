import 'package:equatable/equatable.dart';
import '../../data/models/match_detail_dto.dart';

sealed class MatchLiveState extends Equatable {
  const MatchLiveState();

  @override
  List<Object?> get props => [];
}

final class MatchLiveStateInitial extends MatchLiveState {
  const MatchLiveStateInitial();
}

final class MatchLiveStateLoading extends MatchLiveState {
  const MatchLiveStateLoading();
}

final class MatchLiveStateLoaded extends MatchLiveState {
  const MatchLiveStateLoaded({
    required this.match,
    required this.elapsedSeconds,
    this.submitting = false,
    this.error,
    this.shouldNavigateToResult = false,
  });

  final MatchDetailDto match;
  final int elapsedSeconds;
  final bool submitting;
  final String? error;
  final bool shouldNavigateToResult;

  MatchLiveStateLoaded copyWith({
    MatchDetailDto? match,
    int? elapsedSeconds,
    bool? submitting,
    String? error,
    bool? shouldNavigateToResult,
  }) {
    return MatchLiveStateLoaded(
      match: match ?? this.match,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      submitting: submitting ?? this.submitting,
      error: error ?? this.error,
      shouldNavigateToResult: shouldNavigateToResult ?? this.shouldNavigateToResult,
    );
  }

  @override
  List<Object?> get props => [
    match.id,
    elapsedSeconds,
    submitting,
    error,
    shouldNavigateToResult,
  ];
}

final class MatchLiveStateNotFound extends MatchLiveState {
  const MatchLiveStateNotFound();
}

final class MatchLiveStateFailure extends MatchLiveState {
  const MatchLiveStateFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
