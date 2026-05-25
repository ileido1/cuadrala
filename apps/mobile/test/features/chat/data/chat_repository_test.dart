import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/chat/data/chat_api.dart';
import 'package:cuadrala_mobile/src/features/chat/data/chat_repository.dart';

final class _MockChatApi extends Mock implements ChatApi {}

void main() {
  group('ChatRepository.postMatchMessage', () {
    late _MockChatApi api;
    late ChatRepository repo;

    setUp(() {
      api = _MockChatApi();
      repo = ChatRepository(chatApi: api);
    });

    test('parsea data.message anidado del envelope', () async {
      when(() => api.postMatchChatMessageEnvelope(
            matchId: any(named: 'matchId'),
            body: any(named: 'body'),
          )).thenAnswer(
        (_) async => {
          'success': true,
          'data': {
            'threadId': 'thread-1',
            'message': {
              'id': 'msg-1',
              'senderUserId': 'u1',
              'text': 'hola',
              'createdAt': '2026-05-05T12:00:00.000Z',
            },
          },
        },
      );

      final msg = await repo.postMatchMessage(matchId: 'm1', text: 'hola');

      expect(msg.id, 'msg-1');
      expect(msg.text, 'hola');
      expect(msg.authorUserId, 'u1');
    });
  });
}
