import '../data/models/open_match_dto.dart';

/// Ventana de gracia tras la hora agendada: una partida sigue siendo "próxima"
/// hasta 2h después de su `scheduledAt` (consistente entre Home y la pestaña
/// completa "Mis partidas").
const Duration _kUpcomingGrace = Duration(hours: 2);

/// `true` si la partida cuenta como "próxima":
/// - su estado no es FINISHED ni CANCELLED, y
/// - no tiene fecha (`scheduledAt == null`) o su fecha no quedó más de 2h atrás.
///
/// [now] permite inyectar el reloj en tests para fronteras deterministas.
bool isUpcomingMatch(OpenMatchDto match, {DateTime? now}) {
  final status = match.status.toUpperCase();
  if (status == 'FINISHED' || status == 'CANCELLED') return false;
  final scheduled = match.scheduledAt;
  if (scheduled == null) return true;
  final reference = now ?? DateTime.now();
  return !scheduled.isBefore(reference.subtract(_kUpcomingGrace));
}

/// Complemento exacto de [isUpcomingMatch]: una partida pertenece al historial
/// si no es próxima.
bool isHistoryMatch(OpenMatchDto match, {DateTime? now}) =>
    !isUpcomingMatch(match, now: now);

/// Comparador para ordenar próximas por cercanía ascendente; las que no tienen
/// fecha (`scheduledAt == null`) quedan al final.
int byScheduledAtAscNullsLast(OpenMatchDto a, OpenMatchDto b) {
  final da = a.scheduledAt;
  final db = b.scheduledAt;
  if (da == null && db == null) return 0;
  if (da == null) return 1;
  if (db == null) return -1;
  return da.compareTo(db);
}
