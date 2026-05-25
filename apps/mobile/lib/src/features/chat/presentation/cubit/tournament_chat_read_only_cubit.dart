import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/chat_repository.dart';
import 'tournament_chat_state.dart';

/// Read-only variant of [TournamentChatCubit].
/// Inherits load() and loadMore(); send() is never called in the view.
final class TournamentChatReadOnlyCubit extends Cubit<TournamentChatState> {
  TournamentChatReadOnlyCubit({
    required ChatRepository chatRepository,
    required ProfileRepository profileRepository,
    required String tournamentId,
  })  : _repo = chatRepository,
        _profileRepository = profileRepository,
        _tournamentId = tournamentId,
        super(const TournamentChatInitial());

  final ChatRepository _repo;
  final ProfileRepository _profileRepository;
  final String _tournamentId;
  String? _viewerUserId;

  Future<void> load() async {
    emit(const TournamentChatLoading());
    try {
      final me = await _profileRepository.getMe();
      _viewerUserId = me.id;
      final page =
          await _repo.listTournamentMessages(tournamentId: _tournamentId);
      emit(
        TournamentChatLoaded(
          items: page.items,
          viewerUserId: _viewerUserId!,
          nextCursorCreatedAt: page.nextCursorCreatedAt,
        ),
      );
    } catch (e) {
      final message =
          e is AppFailure ? e.message : 'No se pudo cargar el chat.';
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
        viewerUserId: current.viewerUserId,
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
          viewerUserId: current.viewerUserId,
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
          viewerUserId: current.viewerUserId,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: current.sending,
          sendError: e is AppFailure ? e.message : 'No se pudo cargar más.',
        ),
      );
    }
  }
}
