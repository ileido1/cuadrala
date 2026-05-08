import '../../../core/failures/app_failure.dart';
import 'chat_api.dart';
import 'models/chat_message_dto.dart';

final class ChatMessagesPage {
  const ChatMessagesPage({
    required this.items,
    required this.nextCursorCreatedAt,
  });

  final List<ChatMessageDto> items;
  final String? nextCursorCreatedAt;
}

class ChatRepository {
  ChatRepository({required ChatApi chatApi}) : _api = chatApi;

  final ChatApi _api;

  Future<ChatMessagesPage> listMatchMessages({
    required String matchId,
    int limit = 50,
    String? cursorCreatedAt,
  }) async {
    final json = await _api.listMatchChatMessagesEnvelope(
      matchId: matchId,
      limit: limit,
      cursorCreatedAt: cursorCreatedAt,
    );
    final data = json['data'];
    final raw = data is Map<String, Object?> ? data : json;

    final itemsRaw = raw['items'] ?? raw['messages'] ?? raw['data'];
    if (itemsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(ChatMessageDto.fromJson)
        .toList();

    final nextCursor = raw['nextCursorCreatedAt'] as String?;
    return ChatMessagesPage(items: items, nextCursorCreatedAt: nextCursor);
  }

  Future<ChatMessageDto> postMatchMessage({
    required String matchId,
    required String text,
  }) async {
    final json = await _api.postMatchChatMessageEnvelope(
      matchId: matchId,
      body: {'text': text},
    );
    final data = json['data'];
    if (data is Map<String, Object?>) {
      return ChatMessageDto.fromJson(data);
    }
    if (json['id'] is String) {
      return ChatMessageDto.fromJson(json);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }

  Future<ChatMessagesPage> listTournamentMessages({
    required String tournamentId,
    int limit = 50,
    String? cursorCreatedAt,
  }) async {
    final json = await _api.listTournamentChatMessagesEnvelope(
      tournamentId: tournamentId,
      limit: limit,
      cursorCreatedAt: cursorCreatedAt,
    );
    final data = json['data'];
    final raw = data is Map<String, Object?> ? data : json;

    final itemsRaw = raw['items'] ?? raw['messages'] ?? raw['data'];
    if (itemsRaw is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    final items = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(ChatMessageDto.fromJson)
        .toList();

    final nextCursor = raw['nextCursorCreatedAt'] as String?;
    return ChatMessagesPage(items: items, nextCursorCreatedAt: nextCursor);
  }

  Future<ChatMessageDto> postTournamentMessage({
    required String tournamentId,
    required String text,
  }) async {
    final json = await _api.postTournamentChatMessageEnvelope(
      tournamentId: tournamentId,
      body: {'text': text},
    );
    final data = json['data'];
    if (data is Map<String, Object?>) {
      return ChatMessageDto.fromJson(data);
    }
    if (json['id'] is String) {
      return ChatMessageDto.fromJson(json);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }
}

