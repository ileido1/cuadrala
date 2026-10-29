import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournament_invite_link_repository.dart';
import 'tournament_invite_links_state.dart';

/// Organizer-side cubit: generate / list / revoke invite links
/// (REQ-TIL-001/005/006).
// Not `final`: widget tests may mock this cubit the same way
// `TournamentRegistrationsCubit` is mocked elsewhere in the project.
class TournamentInviteLinksCubit extends Cubit<TournamentInviteLinksState> {
  TournamentInviteLinksCubit({
    required TournamentInviteLinkRepository tournamentInviteLinkRepository,
    required String tournamentId,
  }) : _repo = tournamentInviteLinkRepository,
       _tournamentId = tournamentId,
       super(const TournamentInviteLinksInitial());

  final TournamentInviteLinkRepository _repo;
  final String _tournamentId;

  Future<void> load() async {
    emit(const TournamentInviteLinksLoading());
    try {
      final links = await _repo.list(tournamentId: _tournamentId);
      emit(TournamentInviteLinksLoaded(links: links));
    } on AppFailure catch (e) {
      emit(TournamentInviteLinksFailure(message: e.message));
    } catch (_) {
      emit(
        const TournamentInviteLinksFailure(
          message: 'No se pudieron cargar los links.',
        ),
      );
    }
  }

  /// Generates a new link (REQ-TIL-001) and refreshes the list. The raw
  /// token (REQ-TIL-002) is kept in [TournamentInviteLinksLoaded.lastGeneratedLink]
  /// so the UI can offer "Compartir" exactly once.
  Future<void> generate({DateTime? expiresAt, int? maxUses}) async {
    final current = state;
    if (current is! TournamentInviteLinksLoaded) return;
    if (current.generating) return;

    emit(
      current.copyWith(
        generating: true,
        clearGenerateError: true,
        clearLastGeneratedLink: true,
      ),
    );

    try {
      final link = await _repo.generate(
        tournamentId: _tournamentId,
        expiresAt: expiresAt,
        maxUses: maxUses,
      );
      final refreshed = await _repo.list(tournamentId: _tournamentId);
      emit(
        current.copyWith(
          links: refreshed,
          generating: false,
          lastGeneratedLink: link,
        ),
      );
    } on AppFailure catch (e) {
      emit(current.copyWith(generating: false, generateError: e.message));
    } catch (_) {
      emit(
        current.copyWith(
          generating: false,
          generateError: 'No se pudo generar el link.',
        ),
      );
    }
  }

  /// Revokes a link (REQ-TIL-005) and refreshes the list on success.
  Future<void> revoke(String linkId) async {
    final current = state;
    if (current is! TournamentInviteLinksLoaded) return;
    if (current.busyLinkId != null) return;

    emit(current.copyWith(busyLinkId: linkId, clearRevokeError: true));

    try {
      await _repo.revoke(tournamentId: _tournamentId, linkId: linkId);
      final refreshed = await _repo.list(tournamentId: _tournamentId);
      emit(current.copyWith(links: refreshed, clearBusyLinkId: true));
    } on AppFailure catch (e) {
      emit(current.copyWith(clearBusyLinkId: true, revokeError: e.message));
    } catch (_) {
      emit(
        current.copyWith(
          clearBusyLinkId: true,
          revokeError: 'No se pudo revocar el link.',
        ),
      );
    }
  }
}
