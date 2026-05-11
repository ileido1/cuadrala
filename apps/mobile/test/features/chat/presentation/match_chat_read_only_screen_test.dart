import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/chat/data/chat_repository.dart';
import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/match_chat_read_only_screen.dart';

final class _MockChatRepository extends Mock implements ChatRepository {}

void main() {
  group('MatchChatReadOnlyScreen', () {
    late _MockChatRepository repo;

    setUp(() async {
      await getIt.reset();
      repo = _MockChatRepository();
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
              text: 'Mensaje de prueba',
              createdAt: DateTime.utc(2026, 5, 11, 15, 30),
            ),
          ],
          nextCursorCreatedAt: null,
        ),
      );
      getIt.registerSingleton<ChatRepository>(repo);
    });

    tearDown(() async {
      await getIt.reset();
    });

    testWidgets('renderiza mensajes sin TextField ni botón de enviar', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: MatchChatReadOnlyScreen(matchId: 'm1'),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.byKey(const Key('match.chat.readonly')), findsOneWidget);
      expect(find.text('Mensaje de prueba'), findsOneWidget);
      expect(find.byType(TextField), findsNothing);
      expect(find.byIcon(Icons.send), findsNothing);
    });

    testWidgets('muestra empty state cuando no hay mensajes', (tester) async {
      when(() => repo.listMatchMessages(
            matchId: any(named: 'matchId'),
            limit: any(named: 'limit'),
            cursorCreatedAt: any(named: 'cursorCreatedAt'),
          )).thenAnswer((_) async => const ChatMessagesPage(items: [], nextCursorCreatedAt: null));

      await tester.pumpWidget(
        const MaterialApp(
          home: MatchChatReadOnlyScreen(matchId: 'm1'),
        ),
      );

      await tester.pumpAndSettle();
      expect(find.text('Aún no hay mensajes.'), findsOneWidget);
    });
  });
}