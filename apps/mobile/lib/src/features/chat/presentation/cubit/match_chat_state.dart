import 'package:equatable/equatable.dart';

import '../../data/models/chat_message_dto.dart';

sealed class MatchChatState extends Equatable {
  const MatchChatState();

  @override
  List<Object?> get props => [];
}

final class MatchChatInitial extends MatchChatState {
  const MatchChatInitial();
}

final class MatchChatLoading extends MatchChatState {
  const MatchChatLoading();
}

final class MatchChatFailure extends MatchChatState {
  const MatchChatFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class MatchChatLoaded extends MatchChatState {
  const MatchChatLoaded({
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

