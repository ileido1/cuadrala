import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/chat_messages_order.dart';
import '../../data/chat_repository.dart';
import 'tournament_chat_state.dart';

final class TournamentChatCubit extends Cubit<TournamentChatState> {
  TournamentChatCubit({
    required ChatRepository chatRepository,
    required String tournamentId,
  })  : _repo = chatRepository,
        _tournamentId = tournamentId,
        super(const TournamentChatInitial());

  final ChatRepository _repo;
  final String _tournamentId;

  Future<void> load() async {
    emit(const TournamentChatLoading());
    try {
      final page = await _repo.listTournamentMessages(tournamentId: _tournamentId);
      emit(TournamentChatLoaded(items: page.items, nextCursorCreatedAt: page.nextCursorCreatedAt));
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo cargar el chat.';
      emit(TournamentChatFailure(message: message));
    }
  }

  Future<void> loadMore() async {
    final current = state;
    if (current is! TournamentChatLoaded) return;
    if (current.isLoadingMore) return;
    final cursor = current.nextCursorCreatedAt;
    if (cursor == null) return;

    emit(
      TournamentChatLoaded(
        items: current.items,
        nextCursorCreatedAt: current.nextCursorCreatedAt,
        isLoadingMore: true,
        sending: current.sending,
        sendError: current.sendError,
      ),
    );

    try {
      final page = await _repo.listTournamentMessages(
        tournamentId: _tournamentId,
        cursorCreatedAt: cursor,
      );
      emit(
        TournamentChatLoaded(
          items: [...page.items, ...current.items],
          nextCursorCreatedAt: page.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: current.sending,
          sendError: null,
        ),
      );
    } catch (e) {
      emit(
        TournamentChatLoaded(
          items: current.items,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: current.sending,
          sendError: e is AppFailure ? e.message : 'No se pudo cargar más.',
        ),
      );
    }
  }

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final current = state;
    if (current is! TournamentChatLoaded) return;
    if (current.sending) return;

    emit(
      TournamentChatLoaded(
        items: current.items,
        nextCursorCreatedAt: current.nextCursorCreatedAt,
        isLoadingMore: current.isLoadingMore,
        sending: true,
      ),
    );

    try {
      final created = await _repo.postTournamentMessage(
        tournamentId: _tournamentId,
        text: trimmed,
      );
      final merged = mergeChatMessageChronological(
        current: current.items,
        created: created,
      );
      emit(
        TournamentChatLoaded(
          items: merged,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: false,
        ),
      );
    } catch (e) {
      emit(
        TournamentChatLoaded(
          items: current.items,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: current.isLoadingMore,
          sending: false,
          sendError: e is AppFailure ? e.message : 'No se pudo enviar.',
        ),
      );
    }
  }
}
