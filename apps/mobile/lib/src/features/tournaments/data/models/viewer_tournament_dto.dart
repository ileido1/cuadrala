import 'package:equatable/equatable.dart';

import 'tournament_list_item_dto.dart';

/// Un torneo desde el punto de vista del visor: en qué estado está su
/// inscripción (si tiene), si tiene una invitación pendiente, si lo organiza,
/// y — sólo si lo organiza — cuántas inscripciones esperan que las confirme.
///
/// Mapea `ViewerTournamentItemDTO` (`tournament_query_repository.ts:81-90`)
/// tal como lo devuelve `GET /api/v1/users/me/tournaments`.
final class ViewerTournamentDto extends Equatable {
  const ViewerTournamentDto({
    required this.tournament,
    required this.registrationStatus,
    required this.pendingInvitationId,
    required this.isOrganizer,
    required this.pendingRegistrationsCount,
  });

  final TournamentListItemDto tournament;

  /// `'PENDING'` | `'CONFIRMED'` | `null` cuando el visor no tiene una
  /// inscripción vigente en el torneo.
  final String? registrationStatus;

  /// Id de la invitación PENDING del visor a este torneo; `null` si no hay.
  final String? pendingInvitationId;

  final bool isOrganizer;

  /// Sólo tiene valor cuando [isOrganizer] es `true`; `null` para cualquier
  /// otro rol.
  final int? pendingRegistrationsCount;

  factory ViewerTournamentDto.fromJson(Map<String, Object?> json) {
    return ViewerTournamentDto(
      tournament: TournamentListItemDto.fromJson(
        Map<String, Object?>.from(json['tournament'] as Map),
      ),
      registrationStatus: json['registrationStatus'] as String?,
      pendingInvitationId: json['pendingInvitationId'] as String?,
      isOrganizer: json['isOrganizer'] as bool? ?? false,
      pendingRegistrationsCount: json['pendingRegistrationsCount'] as int?,
    );
  }

  @override
  List<Object?> get props => [
        tournament,
        registrationStatus,
        pendingInvitationId,
        isOrganizer,
        pendingRegistrationsCount,
      ];
}
