import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/chat/data/chat_repository.dart';
import 'package:cuadrala_mobile/src/features/chat/data/models/chat_message_dto.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/cubit/match_chat_read_only_cubit.dart';
import 'package:cuadrala_mobile/src/features/chat/presentation/cubit/match_chat_state.dart';

final class _MockChatRepository extends Mock implements ChatRepository {}

void main() {
  group('MatchChatReadOnlyCubit', () {
    late ChatRepository repo;

    setUp(() async {
      await getIt.reset();
      repo = _MockChatRepository();
      getIt.registerSingleton<ChatRepository>(repo);
    });

    test('load() emite MatchChatLoaded con mensajes', () async {
      final messages = [
        ChatMessageDto(
          id: 'm1',
          threadId: 't1',
          authorUserId: 'u1',
          text: 'Hola',
          createdAt: DateTime.utc(2026, 5, 5, 12),
        ),
      ];
      when(() => repo.listMatchMessages(
            matchId: any(named: 'matchId'),
            limit: any(named: 'limit'),
            cursorCreatedAt: any(named: 'cursorCreatedAt'),
          )).thenAnswer((_) async => ChatMessagesPage(
            items: messages,
            nextCursorCreatedAt: null,
          ));

      final cubit = MatchChatReadOnlyCubit(
        chatRepository: repo,
        matchId: 'match-1',
      );

      await cubit.load();
      final state = cubit.state;
      expect(state, isA<MatchChatLoaded>());
      expect((state as MatchChatLoaded).items, messages);
      await cubit.close();
    });

    test('load() emite MatchChatFailure cuando falla', () async {
      when(() => repo.listMatchMessages(
            matchId: any(named: 'matchId'),
            limit: any(named: 'limit'),
            cursorCreatedAt: any(named: 'cursorCreatedAt'),
          )).thenThrow(Exception('network error'));

      final cubit = MatchChatReadOnlyCubit(
        chatRepository: repo,
        matchId: 'match-1',
      );

      await cubit.load();
      expect(cubit.state, isA<MatchChatFailure>());
      await cubit.close();
    });

    test('loadMore() appends items al cursor', () async {
      final messages1 = [
        ChatMessageDto(
          id: 'm1',
          threadId: 't1',
          authorUserId: 'u1',
          text: 'Primero',
          createdAt: DateTime.utc(2026, 5, 5, 12),
        ),
      ];
      final messages2 = [
        ChatMessageDto(
          id: 'm2',
          threadId: 't1',
          authorUserId: 'u2',
          text: 'Segundo',
          createdAt: DateTime.utc(2026, 5, 5, 13),
        ),
      ];
      when(() => repo.listMatchMessages(
            matchId: any(named: 'matchId'),
            limit: any(named: 'limit'),
            cursorCreatedAt: any(named: 'cursorCreatedAt'),
          )).thenAnswer((inv) async {
        final cursor = inv.namedArguments[#cursorCreatedAt] as String?;
        if (cursor == null) {
          return ChatMessagesPage(items: messages1, nextCursorCreatedAt: '2026-05-05T12:00:00Z');
        }
        return ChatMessagesPage(items: messages2, nextCursorCreatedAt: null);
      });

      final cubit = MatchChatReadOnlyCubit(
        chatRepository: repo,
        matchId: 'match-1',
      );
      await cubit.load();
      await cubit.loadMore();

      final state = cubit.state as MatchChatLoaded;
      expect(state.items.length, 2);
      expect(state.items.last.text, 'Segundo');
      expect(state.isLoadingMore, false);
      await cubit.close();
    });
  });
}