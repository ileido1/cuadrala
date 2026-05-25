import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/chat/data/chat_messages_order.dart';
import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';

void main() {
  group('chronologicalChatPage', () {
    test('invierte desc de la API a asc para la UI', () {
      final page = chronologicalChatPage(
        newestFirst: [
          ChatMessageDto(
            id: '2',
            threadId: 't',
            authorUserId: 'u',
            text: 'nuevo',
            createdAt: DateTime.utc(2026, 5, 5, 12),
          ),
          ChatMessageDto(
            id: '1',
            threadId: 't',
            authorUserId: 'u',
            text: 'viejo',
            createdAt: DateTime.utc(2026, 5, 5, 11),
          ),
        ],
        limit: 50,
      );

      expect(page.items.first.text, 'viejo');
      expect(page.items.last.text, 'nuevo');
    });
  });

  group('mergeChatMessageChronological', () {
    test('agrega el mensaje nuevo al final', () {
      final merged = mergeChatMessageChronological(
        current: [
          ChatMessageDto(
            id: '1',
            threadId: 't',
            authorUserId: 'u',
            text: 'a',
            createdAt: DateTime.utc(2026, 5, 5, 11),
          ),
        ],
        created: ChatMessageDto(
          id: '2',
          threadId: 't',
          authorUserId: 'u',
          text: 'b',
          createdAt: DateTime.utc(2026, 5, 5, 12),
        ),
      );

      expect(merged.last.text, 'b');
    });
  });
}
