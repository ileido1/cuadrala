import 'package:equatable/equatable.dart';

import '../../data/models/match_detail_dto.dart';

sealed class MatchDetailState extends Equatable {
  const MatchDetailState();

  @override
  List<Object?> get props => [];
}

final class MatchDetailInitial extends MatchDetailState {
  const MatchDetailInitial();
}

final class MatchDetailLoading extends MatchDetailState {
  const MatchDetailLoading();
}

final class MatchDetailLoaded extends MatchDetailState {
  const MatchDetailLoaded({
    required this.match,
    required this.viewerUserId,
    this.viewerHasConfirmedPayment = false,
    this.actionLoading = false,
    this.actionMessage,
    this.actionMessageIsError = false,
  });

  final MatchDetailDto match;
  final String viewerUserId;
  final bool viewerHasConfirmedPayment;
  final bool actionLoading;
  final String? actionMessage;
  final bool actionMessageIsError;

  bool get isParticipant => match.participants.any((p) => p.userId == viewerUserId);

  @override
  List<Object?> get props => [
        match,
        viewerUserId,
        viewerHasConfirmedPayment,
        actionLoading,
        actionMessage,
        actionMessageIsError,
      ];
}

final class MatchDetailFailure extends MatchDetailState {
  const MatchDetailFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

final class MatchDetailNotFound extends MatchDetailState {
  const MatchDetailNotFound();
}
