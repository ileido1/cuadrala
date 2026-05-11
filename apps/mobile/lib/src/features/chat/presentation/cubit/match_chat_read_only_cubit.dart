import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/chat_repository.dart';
import 'match_chat_state.dart';

/// Read-only variant of [MatchChatCubit].
/// Inherits load() and loadMore(); send() is never called in the view.
final class MatchChatReadOnlyCubit extends Cubit<MatchChatState> {
  MatchChatReadOnlyCubit({
    required ChatRepository chatRepository,
    required String matchId,
  })  : _repo = chatRepository,
        _matchId = matchId,
        super(const MatchChatInitial());

  final ChatRepository _repo;
  final String _matchId;

  Future<void> load() async {
    emit(const MatchChatLoading());
    try {
      final page = await _repo.listMatchMessages(matchId: _matchId);
      emit(MatchChatLoaded(items: page.items, nextCursorCreatedAt: page.nextCursorCreatedAt));
    } catch (e) {
      emit(const MatchChatFailure(message: 'No se pudo cargar el chat.'));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! MatchChatLoaded) return;
    if (current.isLoadingMore) return;
    final cursor = current.nextCursorCreatedAt;
    if (cursor == null) return;

    emit(
      MatchChatLoaded(
        items: current.items,
        nextCursorCreatedAt: current.nextCursorCreatedAt,
        isLoadingMore: true,
        sending: current.sending,
        sendError: current.sendError,
      ),
    );

    try {
      final page = await _repo.listMatchMessages(
        matchId: _matchId,
        cursorCreatedAt: cursor,
      );
      emit(
        MatchChatLoaded(
          items: [...current.items, ...page.items],
          nextCursorCreatedAt: page.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: current.sending,
          sendError: null,
        ),
      );
    } catch (e) {
      emit(
        MatchChatLoaded(
          items: current.items,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: current.sending,
          sendError: 'No se pudo cargar más.',
        ),
      );
    }
  }
}