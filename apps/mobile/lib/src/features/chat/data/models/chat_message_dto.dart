final class ChatMessageDto {
  const ChatMessageDto({
    required this.id,
    required this.threadId,
    required this.authorUserId,
    required this.senderDisplayName,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String authorUserId;
  final String senderDisplayName;
  final String text;
  final DateTime createdAt;

  static ChatMessageDto fromJson(Map<String, Object?> json) {
    final authorId = (json['senderUserId'] as String?) ??
        (json['authorUserId'] as String?) ??
        (json['userId'] as String?) ??
        (json['authorId'] as String?) ??
        '';
    final displayName = (json['senderDisplayName'] as String?)?.trim();
    return ChatMessageDto(
      id: json['id'] as String,
      threadId: (json['threadId'] as String?) ?? '',
      authorUserId: authorId,
      senderDisplayName:
          displayName != null && displayName.isNotEmpty
              ? displayName
              : 'Jugador',
      text: json['text'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

