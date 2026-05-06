import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/chat/data/chat_repository.dart';
import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/match_chat_screen.dart';

final class _MockChatRepository extends Mock implements ChatRepository {}

void main() {
  group('MatchChatScreen', () {
    setUp(() async {
      await getIt.reset();
      final repo = _MockChatRepository();
      when(() => repo.listMatchMessages(
            matchId: any(named: 'matchId'),
            limit: any(named: 'limit'),
            cursorCreatedAt: any(named: 'cursorCreatedAt'),
          )).thenAnswer(
        (_) async => ChatMessagesPage(
          items: [
            ChatMessageDto(
              id: 'c1',
              threadId: 't',
              authorUserId: 'u1',
              text: 'Hola',
              createdAt: DateTime.utc(2026, 5, 5, 12),
            ),
          ],
          nextCursorCreatedAt: null,
        ),
      );
      when(() => repo.postMatchMessage(matchId: any(named: 'matchId'), text: any(named: 'text')))
          .thenAnswer(
        (_) async => ChatMessageDto(
          id: 'c2',
          threadId: 't',
          authorUserId: 'u1',
          text: 'ok',
          createdAt: DateTime.utc(2026, 5, 5, 12, 1),
        ),
      );
      getIt.registerSingleton<ChatRepository>(repo);
    });

    testWidgets('renderiza mensajes cuando load() completa', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: MatchChatScreen(matchId: 'm1'),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.byKey(const Key('match.chat')), findsOneWidget);
      expect(find.text('Hola'), findsOneWidget);
    });
  });
}

