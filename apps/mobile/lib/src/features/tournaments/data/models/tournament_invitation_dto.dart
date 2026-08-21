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
  });

  final String id;
  final String tournamentId;
  final String invitedUserId;
  final String createdByUserId;

  /// One of `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`.
  final String status;
  final DateTime createdAt;

  bool get isPending => status == 'PENDING';

  factory TournamentInvitationDto.fromJson(Map<String, Object?> json) {
    return TournamentInvitationDto(
      id: json['id'] as String,
      tournamentId: json['tournamentId'] as String,
      invitedUserId: json['invitedUserId'] as String,
      createdByUserId: json['createdByUserId'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
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
      ];
}
