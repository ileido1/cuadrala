import 'package:equatable/equatable.dart';

/// DTO for a tournament invitation returned by the
/// `/api/v1/tournaments/:id/invitations*` endpoints.
final class TournamentInvitationDto extends Equatable {
  const TournamentInvitationDto({
    required this.id,
    required this.tournamentId,
    required this.invitedUserId,
    required this.createdByUserId,
    required this.status,
    required this.createdAt,
    this.invitedUserName,
  });

  final String id;
  final String tournamentId;
  final String invitedUserId;
  final String createdByUserId;

  /// One of `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`.
  final String status;
  final DateTime createdAt;

  /// Display name of the invited user (S3a — `organizerName`/`invitedUserName`
  /// design D7). `null` when the API can't resolve it (e.g. deleted user).
  final String? invitedUserName;

  bool get isPending => status == 'PENDING';

  bool get isRejected => status == 'REJECTED';

  /// Label for the organizer's "Invitaciones enviadas" row, falling back to
  /// the raw id when [invitedUserName] is unavailable.
  String get invitedDisplayName => invitedUserName ?? invitedUserId;

  factory TournamentInvitationDto.fromJson(Map<String, Object?> json) {
    return TournamentInvitationDto(
      id: json['id'] as String,
      tournamentId: json['tournamentId'] as String,
      invitedUserId: json['invitedUserId'] as String,
      createdByUserId: json['createdByUserId'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      invitedUserName: json['invitedUserName'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        id,
        tournamentId,
        invitedUserId,
        createdByUserId,
        status,
        createdAt,
        invitedUserName,
      ];
}
