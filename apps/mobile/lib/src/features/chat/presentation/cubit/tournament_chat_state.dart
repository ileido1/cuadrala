import 'package:equatable/equatable.dart';

import '../../data/models/chat_message_dto.dart';

sealed class TournamentChatState extends Equatable {
  const TournamentChatState();

  @override
  List<Object?> get props => [];
}

final class TournamentChatInitial extends TournamentChatState {
  const TournamentChatInitial();
}

final class TournamentChatLoading extends TournamentChatState {
  const TournamentChatLoading();
}

final class TournamentChatFailure extends TournamentChatState {
  const TournamentChatFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class TournamentChatLoaded extends TournamentChatState {
  const TournamentChatLoaded({
    required this.items,
    required this.viewerUserId,
    required this.nextCursorCreatedAt,
    this.isLoadingMore = false,
    this.sending = false,
    this.sendError,
  });

  final List<ChatMessageDto> items;
  final String viewerUserId;
  final String? nextCursorCreatedAt;
  final bool isLoadingMore;
  final bool sending;
  final String? sendError;

  @override
  List<Object?> get props => [
        items,
        viewerUserId,
        nextCursorCreatedAt,
        isLoadingMore,
        sending,
        sendError,
      ];
}
