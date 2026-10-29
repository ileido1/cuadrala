import 'package:equatable/equatable.dart';

import '../../data/models/tournament_invite_link_dto.dart';

/// Organizer-side state for [TournamentInviteLinksCubit] (REQ-TIL-001/005/006).
sealed class TournamentInviteLinksState extends Equatable {
  const TournamentInviteLinksState();

  @override
  List<Object?> get props => [];
}

final class TournamentInviteLinksInitial extends TournamentInviteLinksState {
  const TournamentInviteLinksInitial();
}

final class TournamentInviteLinksLoading extends TournamentInviteLinksState {
  const TournamentInviteLinksLoading();
}

final class TournamentInviteLinksFailure extends TournamentInviteLinksState {
  const TournamentInviteLinksFailure({required this.message});

  final String message;

  @override
  List<Object?> get props => [message];
}

final class TournamentInviteLinksLoaded extends TournamentInviteLinksState {
  const TournamentInviteLinksLoaded({
    required this.links,
    this.generating = false,
    this.generateError,
    this.lastGeneratedLink,
    this.busyLinkId,
    this.revokeError,
  });

  final List<TournamentInviteLinkDto> links;

  final bool generating;
  final String? generateError;

  /// The link just created by [TournamentInviteLinksCubit.generate]. Carries
  /// the raw `token`/`url`/`deepLink` so the UI can offer "Compartir" once —
  /// the backend never returns the raw token again (REQ-TIL-002). `null`
  /// once consumed or after a fresh [TournamentInviteLinksCubit.load].
  final TournamentInviteLinkDto? lastGeneratedLink;

  /// Id of the link currently being revoked, if any. Only one revoke action
  /// runs at a time.
  final String? busyLinkId;
  final String? revokeError;

  TournamentInviteLinksLoaded copyWith({
    List<TournamentInviteLinkDto>? links,
    bool? generating,
    String? generateError,
    bool clearGenerateError = false,
    TournamentInviteLinkDto? lastGeneratedLink,
    bool clearLastGeneratedLink = false,
    String? busyLinkId,
    bool clearBusyLinkId = false,
    String? revokeError,
    bool clearRevokeError = false,
  }) {
    return TournamentInviteLinksLoaded(
      links: links ?? this.links,
      generating: generating ?? this.generating,
      generateError: clearGenerateError
          ? null
          : (generateError ?? this.generateError),
      lastGeneratedLink: clearLastGeneratedLink
          ? null
          : (lastGeneratedLink ?? this.lastGeneratedLink),
      busyLinkId: clearBusyLinkId ? null : (busyLinkId ?? this.busyLinkId),
      revokeError: clearRevokeError ? null : (revokeError ?? this.revokeError),
    );
  }

  @override
  List<Object?> get props => [
    links,
    generating,
    generateError,
    lastGeneratedLink,
    busyLinkId,
    revokeError,
  ];
}
