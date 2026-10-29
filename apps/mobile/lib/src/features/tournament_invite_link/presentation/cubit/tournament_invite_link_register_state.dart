import 'package:equatable/equatable.dart';

import '../../data/models/tournament_invite_link_dto.dart';

/// Public/player-side state for [TournamentInviteLinkRegisterCubit]
/// (REQ-TIL-007/008/012) — the screen the deep link / `/invite/:token`
/// landing resolves to.
sealed class TournamentInviteLinkRegisterState extends Equatable {
  const TournamentInviteLinkRegisterState();

  @override
  List<Object?> get props => [];
}

final class TournamentInviteLinkRegisterInitial
    extends TournamentInviteLinkRegisterState {
  const TournamentInviteLinkRegisterInitial();
}

final class TournamentInviteLinkRegisterLoadingPreview
    extends TournamentInviteLinkRegisterState {
  const TournamentInviteLinkRegisterLoadingPreview();
}

/// The link could not be previewed at all (expired/revoked/exhausted/not
/// found/generic) — REQ-TIL-012's "Previsualización de link inválido".
final class TournamentInviteLinkRegisterInvalid
    extends TournamentInviteLinkRegisterState {
  const TournamentInviteLinkRegisterInvalid({
    required this.reason,
    required this.message,
  });

  /// One of `EXPIRED`, `REVOKED`, `EXHAUSTED`, `NOT_FOUND`, `GENERIC`.
  final String reason;
  final String message;

  @override
  List<Object?> get props => [reason, message];
}

final class TournamentInviteLinkRegisterPreviewLoaded
    extends TournamentInviteLinkRegisterState {
  const TournamentInviteLinkRegisterPreviewLoaded({
    required this.preview,
    this.isAuthenticated = false,
    this.registering = false,
    this.registerError,
    this.result,
  });

  final TournamentInviteLinkPreviewDto preview;

  /// Whether the current caller has a valid session. When `true`, the
  /// register call carries no guest body (the backend reads the actor from
  /// the session) — when `false`, [register] requires `name`/`email`.
  final bool isAuthenticated;

  final bool registering;
  final String? registerError;

  /// Set once the registration succeeds — the UI shows a confirmation.
  final TournamentInviteLinkRegistrationResultDto? result;

  bool get isRegistered => result != null;

  TournamentInviteLinkRegisterPreviewLoaded copyWith({
    TournamentInviteLinkPreviewDto? preview,
    bool? isAuthenticated,
    bool? registering,
    String? registerError,
    bool clearRegisterError = false,
    TournamentInviteLinkRegistrationResultDto? result,
  }) {
    return TournamentInviteLinkRegisterPreviewLoaded(
      preview: preview ?? this.preview,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      registering: registering ?? this.registering,
      registerError: clearRegisterError
          ? null
          : (registerError ?? this.registerError),
      result: result ?? this.result,
    );
  }

  @override
  List<Object?> get props => [
    preview,
    isAuthenticated,
    registering,
    registerError,
    result,
  ];
}
