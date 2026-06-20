import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/chat/data/chat_repository.dart';
import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/match_chat_screen.dart';
import 'package:cuadrala_mobile/src/features/profile/data/profile_repository.dart';
import 'package:cuadrala_mobile/src/features/profile/data/models/user_me_dto.dart';

final class _MockChatRepository extends Mock implements ChatRepository {}
final class _MockProfileRepository extends Mock implements ProfileRepository {}

void main() {
  group('MatchChatScreen', () {
    late _MockChatRepository repo;
    late _MockProfileRepository profileRepo;

    setUp(() async {
      await getIt.reset();
      repo = _MockChatRepository();
      profileRepo = _MockProfileRepository();
      when(() => profileRepo.getMe()).thenAnswer(
        (_) async => const UserMeDto(
          id: 'u1',
          email: 'a@test.local',
          name: 'Usuario',
          subscriptionType: 'FREE',
        ),
      );
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
              senderDisplayName: 'Jugador',
              text: 'Hola',
              createdAt: DateTime.utc(2026, 5, 5, 12),
            ),
          ],
          nextCursorCreatedAt: null,
        ),
      );
      when(() => repo.postMatchMessage(matchId: any(named: 'matchId'), text: any(named: 'text')))
          .thenAnswer(
        (invocation) async => ChatMessageDto(
          id: 'c2',
          threadId: 't',
          authorUserId: 'u1',
          senderDisplayName: 'Jugador',
          text: invocation.namedArguments[#text] as String,
          createdAt: DateTime.utc(2026, 5, 5, 12, 1),
        ),
      );
      getIt.registerSingleton<ChatRepository>(repo);
      getIt.registerSingleton<ProfileRepository>(profileRepo);
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

    testWidgets('muestra el mensaje enviado sin recargar la pantalla', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: MatchChatScreen(matchId: 'm1'),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'Mensaje nuevo');
      await tester.tap(find.byIcon(AppIcons.send));
      await tester.pumpAndSettle();

      expect(find.text('Mensaje nuevo'), findsOneWidget);
      verify(() => repo.postMatchMessage(matchId: 'm1', text: 'Mensaje nuevo')).called(1);
    });
  });
}

