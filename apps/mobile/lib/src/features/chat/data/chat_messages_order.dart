import 'models/chat_message_dto.dart';
import 'chat_repository.dart';

/// La API lista mensajes `createdAt desc` (más nuevo primero).
/// La UI de chat muestra cronológico: más antiguo arriba, más nuevo abajo.
ChatMessagesPage chronologicalChatPage({
  required List<ChatMessageDto> newestFirst,
  required int limit,
  String? apiNextCursor,
}) {
  final chronological = newestFirst.reversed.toList();
  final nextCursor = apiNextCursor ??
      (newestFirst.length >= limit
          ? newestFirst.last.createdAt.toUtc().toIso8601String()
          : null);
  return ChatMessagesPage(
    items: chronological,
    nextCursorCreatedAt: nextCursor,
  );
}

List<ChatMessageDto> mergeChatMessageChronological({
  required List<ChatMessageDto> current,
  required ChatMessageDto created,
}) {
  final merged = [
    ...current.where((m) => m.id != created.id),
    created,
  ]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  return merged;
}
