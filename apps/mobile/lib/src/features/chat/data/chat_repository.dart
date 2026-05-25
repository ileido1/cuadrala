import '../../../core/failures/app_failure.dart';
import 'chat_api.dart';
import 'chat_messages_order.dart';
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

    final newestFirst = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(ChatMessageDto.fromJson)
        .toList();

    return chronologicalChatPage(
      newestFirst: newestFirst,
      limit: limit,
      apiNextCursor: raw['nextCursorCreatedAt'] as String?,
    );
  }

  Future<ChatMessageDto> postMatchMessage({
    required String matchId,
    required String text,
  }) async {
    final json = await _api.postMatchChatMessageEnvelope(
      matchId: matchId,
      body: {'text': text},
    );
    return _parsePostedMessage(json);
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

    final newestFirst = itemsRaw
        .whereType<Map<String, Object?>>()
        .map(ChatMessageDto.fromJson)
        .toList();

    return chronologicalChatPage(
      newestFirst: newestFirst,
      limit: limit,
      apiNextCursor: raw['nextCursorCreatedAt'] as String?,
    );
  }

  Future<ChatMessageDto> postTournamentMessage({
    required String tournamentId,
    required String text,
  }) async {
    final json = await _api.postTournamentChatMessageEnvelope(
      tournamentId: tournamentId,
      body: {'text': text},
    );
    return _parsePostedMessage(json);
  }

  ChatMessageDto _parsePostedMessage(Map<String, Object?> json) {
    final data = json['data'];
    if (data is Map<String, Object?>) {
      final nested = data['message'];
      if (nested is Map<String, Object?>) {
        return ChatMessageDto.fromJson(nested);
      }
      if (data['id'] is String && data['text'] is String) {
        return ChatMessageDto.fromJson(data);
      }
    }
    if (json['id'] is String && json['text'] is String) {
      return ChatMessageDto.fromJson(json);
    }
    throw const AppFailure(
      code: 'INVALID_RESPONSE',
      message: 'Respuesta inválida del servidor.',
    );
  }
}

