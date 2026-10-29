import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/failures/app_failure.dart';
import '../../data/tournament_invite_link_repository.dart';
import 'tournament_invite_link_register_state.dart';

/// Public/player-side cubit: preview + register via an invite link
/// (REQ-TIL-007/008/012) — the deep link / `/invite/:token` landing screen's
/// controller.
// Not `final`: widget tests may mock this cubit the same way other feature
// cubits are mocked elsewhere in the project.
class TournamentInviteLinkRegisterCubit
    extends Cubit<TournamentInviteLinkRegisterState> {
  TournamentInviteLinkRegisterCubit({
    required TournamentInviteLinkRepository tournamentInviteLinkRepository,
    required String token,
    bool isAuthenticated = false,
  }) : _repo = tournamentInviteLinkRepository,
       _token = token,
       _isAuthenticated = isAuthenticated,
       super(const TournamentInviteLinkRegisterInitial());

  final TournamentInviteLinkRepository _repo;
  final String _token;

  /// Whether the current caller has a valid session. `ApiClient`'s
  /// interceptor attaches `Authorization` automatically when there is one —
  /// this flag only decides whether [register] sends a guest body.
  final bool _isAuthenticated;

  Future<void> loadPreview() async {
    emit(const TournamentInviteLinkRegisterLoadingPreview());
    try {
      final preview = await _repo.preview(token: _token);
      emit(
        TournamentInviteLinkRegisterPreviewLoaded(
          preview: preview,
          isAuthenticated: _isAuthenticated,
        ),
      );
    } on AppFailure catch (e) {
      emit(
        TournamentInviteLinkRegisterInvalid(
          reason: _invalidReasonFor(e.code),
          message: e.message,
        ),
      );
    } catch (_) {
      emit(
        const TournamentInviteLinkRegisterInvalid(
          reason: 'GENERIC',
          message: 'No se pudo cargar la invitación.',
        ),
      );
    }
  }

  /// REQ-TIL-012's "mensaje específico según el motivo (expirado / revocado
  /// / agotado / torneo cerrado)". `TORNEO_CERRADO` is not mapped here: the
  /// preview endpoint reflects it via `acceptsRegistration`, it never
  /// throws (same as `isTournamentRosterOpenSV` being informational).
  String _invalidReasonFor(String code) {
    switch (code) {
      case 'ENLACE_INVALIDO':
        return 'EXPIRED';
      case 'ENLACE_REVOCADO':
        return 'REVOKED';
      case 'ENLACE_AGOTADO':
        return 'EXHAUSTED';
      case 'TORNEO_NO_ENCONTRADO':
        return 'NOT_FOUND';
      default:
        return 'GENERIC';
    }
  }

  /// Registers via the link (REQ-TIL-007/008). `name`/`phone`/`email` are
  /// ignored for an authenticated caller — the backend reads the actor from
  /// the session instead of the body.
  Future<void> register({String? name, String? phone, String? email}) async {
    final current = state;
    if (current is! TournamentInviteLinkRegisterPreviewLoaded) return;
    if (current.registering) return;

    emit(current.copyWith(registering: true, clearRegisterError: true));

    try {
      final result = await _repo.register(
        token: _token,
        name: _isAuthenticated ? null : name,
        phone: _isAuthenticated ? null : phone,
        email: _isAuthenticated ? null : email,
      );
      emit(current.copyWith(registering: false, result: result));
    } on AppFailure catch (e) {
      emit(current.copyWith(registering: false, registerError: e.message));
    } catch (_) {
      emit(
        current.copyWith(
          registering: false,
          registerError: 'No se pudo completar la inscripción.',
        ),
      );
    }
  }
}
