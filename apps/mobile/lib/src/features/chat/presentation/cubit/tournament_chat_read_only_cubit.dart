import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/chat_repository.dart';
import 'tournament_chat_state.dart';

/// Read-only variant of [TournamentChatCubit].
/// Inherits load() and loadMore(); send() is never called in the view.
final class TournamentChatReadOnlyCubit extends Cubit<TournamentChatState> {
  TournamentChatReadOnlyCubit({
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
      emit(const TournamentChatFailure(message: 'No se pudo cargar el chat.'));
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
          sendError: 'No se pudo cargar más.',
        ),
      );
    }
  }
}