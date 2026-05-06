final class ChatMessageDto {
  const ChatMessageDto({
    required this.id,
    required this.threadId,
    required this.authorUserId,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final String threadId;
  final String authorUserId;
  final String text;
  final DateTime createdAt;

  static ChatMessageDto fromJson(Map<String, Object?> json) {
    return ChatMessageDto(
      id: json['id'] as String,
      threadId: (json['threadId'] as String?) ?? '',
      authorUserId: (json['senderUserId'] as String?) ??
          (json['authorUserId'] as String?) ??
          (json['userId'] as String?) ??
          (json['authorId'] as String?) ??
          '',
      text: json['text'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

