import 'package:equatable/equatable.dart';

import '../../data/models/tournament_invitation_dto.dart';
import '../../data/models/tournament_registration_dto.dart';

sealed class TournamentRegistrationsState extends Equatable {
  const TournamentRegistrationsState();

  @override
  List<Object?> get props => [];
}

final class TournamentRegistrationsInitial extends TournamentRegistrationsState {
  const TournamentRegistrationsInitial();
}

final class TournamentRegistrationsLoading extends TournamentRegistrationsState {
  const TournamentRegistrationsLoading();
}

final class TournamentRegistrationsFailure extends TournamentRegistrationsState {
  const TournamentRegistrationsFailure({required this.message});
  final String message;

  @override
  List<Object?> get props => [message];
}

final class TournamentRegistrationsLoaded extends TournamentRegistrationsState {
  const TournamentRegistrationsLoaded({
    required this.items,
    required this.total,
    this.invitations = const [],
    this.registering = false,
    this.registerError,
    this.responding = false,
    this.inviting = false,
    this.invitationError,
    this.canManageInvitations = false,
    this.invitingGuest = false,
    this.guestInviteError,
    this.busyRegistrationId,
    this.registrationActionError,
  });

  final List<TournamentRegistrationDto> items;
  final int total;

  /// Invitations visible to the current user: when the actor is the
  /// organizer this is the full tournament invite list (used to invite new
  /// players and cancel pending ones); otherwise it's whatever invitations
  /// the read path could resolve for them (see [canManageInvitations]).
  final List<TournamentInvitationDto> invitations;

  final bool registering;
  final String? registerError;

  /// True while an accept/reject call is in flight.
  final bool responding;

  /// True while an invite/cancel call is in flight.
  final bool inviting;
  final String? invitationError;

  /// True when the invitations list was fetched with organizer privileges
  /// (i.e. the read succeeded rather than being denied with 403).
  final bool canManageInvitations;

  /// True while an invite-guest call is in flight (Slice 1:
  /// tournament-guest-registration).
  final bool invitingGuest;
  final String? guestInviteError;

  /// Id of the registration currently being confirmed or removed, if any.
  /// Only one guest action runs at a time.
  final String? busyRegistrationId;
  final String? registrationActionError;

  bool isUserRegistered(String userId) {
    return items.any((r) => r.userId == userId && r.status != 'WITHDRAWN');
  }

  /// The current user's own PENDING invitation, if any.
  TournamentInvitationDto? pendingInvitationFor(String userId) {
    for (final invitation in invitations) {
      if (invitation.invitedUserId == userId && invitation.isPending) {
        return invitation;
      }
    }
    return null;
  }

  TournamentRegistrationsLoaded copyWith({
    List<TournamentRegistrationDto>? items,
    int? total,
    List<TournamentInvitationDto>? invitations,
    bool? registering,
    String? registerError,
    bool clearRegisterError = false,
    bool? responding,
    bool? inviting,
    String? invitationError,
    bool clearInvitationError = false,
    bool? canManageInvitations,
    bool? invitingGuest,
    String? guestInviteError,
    bool clearGuestInviteError = false,
    String? busyRegistrationId,
    bool clearBusyRegistrationId = false,
    String? registrationActionError,
    bool clearRegistrationActionError = false,
  }) {
    return TournamentRegistrationsLoaded(
      items: items ?? this.items,
      total: total ?? this.total,
      invitations: invitations ?? this.invitations,
      registering: registering ?? this.registering,
      registerError: clearRegisterError ? null : (registerError ?? this.registerError),
      responding: responding ?? this.responding,
      inviting: inviting ?? this.inviting,
      invitationError: clearInvitationError ? null : (invitationError ?? this.invitationError),
      canManageInvitations: canManageInvitations ?? this.canManageInvitations,
      invitingGuest: invitingGuest ?? this.invitingGuest,
      guestInviteError:
          clearGuestInviteError ? null : (guestInviteError ?? this.guestInviteError),
      busyRegistrationId:
          clearBusyRegistrationId ? null : (busyRegistrationId ?? this.busyRegistrationId),
      registrationActionError: clearRegistrationActionError
          ? null
          : (registrationActionError ?? this.registrationActionError),
    );
  }

  @override
  List<Object?> get props => [
        items,
        total,
        invitations,
        registering,
        registerError,
        responding,
        inviting,
        invitationError,
        canManageInvitations,
        invitingGuest,
        guestInviteError,
        busyRegistrationId,
        registrationActionError,
      ];
}
