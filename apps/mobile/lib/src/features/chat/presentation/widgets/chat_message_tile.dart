import 'package:flutter/material.dart';

import '../../data/models/chat_message_dto.dart';
import 'group_chat_message_bubble.dart';

/// Mensaje de chat en modo solo lectura (misma UX que el chat grupal).
final class ChatMessageTile extends StatelessWidget {
  const ChatMessageTile({
    super.key,
    required this.message,
    this.viewerUserId = '',
    this.showSenderName = true,
  });

  final ChatMessageDto message;
  final String viewerUserId;
  final bool showSenderName;

  @override
  Widget build(BuildContext context) {
    return GroupChatMessageBubble(
      message: message,
      viewerUserId: viewerUserId,
      showSenderName: showSenderName,
    );
  }
}
