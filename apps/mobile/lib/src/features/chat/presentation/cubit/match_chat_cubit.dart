import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../../profile/data/profile_repository.dart';
import '../../data/chat_messages_order.dart';
import '../../data/chat_repository.dart';
import 'match_chat_state.dart';

final class MatchChatCubit extends Cubit<MatchChatState> {
  MatchChatCubit({
    required ChatRepository chatRepository,
    required ProfileRepository profileRepository,
    required String matchId,
  })  : _repo = chatRepository,
        _profileRepository = profileRepository,
        _matchId = matchId,
        super(const MatchChatInitial());

  final ChatRepository _repo;
  final ProfileRepository _profileRepository;
  final String _matchId;
  String? _viewerUserId;

  Future<void> load() async {
    emit(const MatchChatLoading());
    try {
      final me = await _profileRepository.getMe();
      _viewerUserId = me.id;
      final page = await _repo.listMatchMessages(matchId: _matchId);
      emit(
        MatchChatLoaded(
          items: page.items,
          viewerUserId: _viewerUserId!,
          nextCursorCreatedAt: page.nextCursorCreatedAt,
        ),
      );
    } catch (e) {
      final message = e is AppFailure ? e.message : 'No se pudo cargar el chat.';
      emit(MatchChatFailure(message: message));
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
        viewerUserId: current.viewerUserId,
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
        MatchChatLoaded(
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

  Future<void> send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    final current = state;
    if (current is! MatchChatLoaded) return;
    if (current.sending) return;

    emit(
      MatchChatLoaded(
        items: current.items,
        viewerUserId: current.viewerUserId,
        nextCursorCreatedAt: current.nextCursorCreatedAt,
        isLoadingMore: current.isLoadingMore,
        sending: true,
      ),
    );

    try {
      final created = await _repo.postMatchMessage(
        matchId: _matchId,
        text: trimmed,
      );
      final merged = mergeChatMessageChronological(
        current: current.items,
        created: created,
      );
      emit(
        MatchChatLoaded(
          items: merged,
          viewerUserId: current.viewerUserId,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: false,
          sending: false,
        ),
      );
    } catch (e) {
      emit(
        MatchChatLoaded(
          items: current.items,
          viewerUserId: current.viewerUserId,
          nextCursorCreatedAt: current.nextCursorCreatedAt,
          isLoadingMore: current.isLoadingMore,
          sending: false,
          sendError: e is AppFailure ? e.message : 'No se pudo enviar.',
        ),
      );
    }
  }
}

