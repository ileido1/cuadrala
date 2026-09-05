import 'package:flutter/material.dart';

/// Los estados que la API puede devolver, en orden de ciclo de vida.
///
/// Espeja el enum `TournamentStatus` de Prisma. La pantalla de detalle traducía
/// `REGISTRATION_OPEN`, `REGISTRATION_CLOSED` y `FINISHED`, que son de un modelo
/// anterior y ya no existen: los estados reales caían en el `default` y al
/// usuario le aparecían en crudo.
const tournamentStatuses = <String>[
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

/// Estados en los que el plantel todavía admite altas y bajas.
///
/// Espeja `TOURNAMENT_ROSTER_OPEN_STATUSES` de la API
/// (`domain/tournament/tournament_registration_window.ts`). Si las dos listas se
/// separan, la app vuelve a ofrecer un botón que el servidor rechaza con 409.
const _rosterOpenStatuses = <String>{'DRAFT', 'OPEN'};

/// `true` si en [status] se puede entrar o salir del torneo.
///
/// Falla cerrado ante un estado desconocido o nulo: no ofrecer la acción es
/// mejor que ofrecer una que termina en error.
bool isTournamentRosterOpen(String? status) {
  if (status == null) return false;
  return _rosterOpenStatuses.contains(status.toUpperCase());
}

/// Etiqueta en español para [status]. Nunca devuelve el valor crudo del enum.
String tournamentStatusLabel(String? status) => switch (status?.toUpperCase()) {
      'DRAFT' => 'Borrador',
      'OPEN' => 'Inscripciones abiertas',
      'IN_PROGRESS' => 'En curso',
      'COMPLETED' => 'Finalizado',
      'CANCELLED' => 'Cancelado',
      _ => 'Estado desconocido',
    };

/// Color del badge de [status]. Verde solo cuando el torneo admite gente.
Color tournamentStatusColor(String? status) => switch (status?.toUpperCase()) {
      'DRAFT' => Colors.blueGrey,
      'OPEN' => Colors.green,
      'IN_PROGRESS' => Colors.blue,
      'COMPLETED' => Colors.indigo,
      'CANCELLED' => Colors.red,
      _ => Colors.grey,
    };
