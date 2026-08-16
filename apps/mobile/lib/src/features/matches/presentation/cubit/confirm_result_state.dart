import 'package:equatable/equatable.dart';

sealed class ConfirmResultState extends Equatable {
  const ConfirmResultState();

  @override
  List<Object?> get props => [];
}

final class ConfirmResultStateInitial extends ConfirmResultState {
  const ConfirmResultStateInitial();
}

final class ConfirmResultStateLoading extends ConfirmResultState {
  const ConfirmResultStateLoading();
}

final class ConfirmResultStateLoaded extends ConfirmResultState {
  const ConfirmResultStateLoaded({
    required this.draft,
    this.submitting = false,
    this.error,
    this.completed = false,
  });

  final MatchResultDraftModel draft;
  final bool submitting;
  final String? error;
  final bool completed;

  ConfirmResultStateLoaded copyWith({
    MatchResultDraftModel? draft,
    bool? submitting,
    String? error,
    bool? completed,
  }) {
    return ConfirmResultStateLoaded(
      draft: draft ?? this.draft,
      submitting: submitting ?? this.submitting,
      error: error ?? this.error,
      completed: completed ?? this.completed,
    );
  }

  @override
  List<Object?> get props => [draft.id, submitting, error, completed];
}

final class ConfirmResultStateNotFound extends ConfirmResultState {
  const ConfirmResultStateNotFound();
}

final class ConfirmResultStateFailure extends ConfirmResultState {
  const ConfirmResultStateFailure(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}

//? DTO simple para el borrador de resultado
class MatchResultDraftModel {
  const MatchResultDraftModel({
    required this.id,
    required this.matchId,
    required this.proposedByUserId,
    this.proposedByName,
    this.teamASetWins,
    this.teamBSetWins,
    this.teamAPoints,
    this.teamBPoints,
  });

  final String id;
  final String matchId;
  final String proposedByUserId;
  final String? proposedByName;
  final int? teamASetWins;
  final int? teamBSetWins;
  final int? teamAPoints;
  final int? teamBPoints;
}
