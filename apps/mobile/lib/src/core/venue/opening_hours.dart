// Horarios de sede (paridad con apps/web/src/lib/venue-opening-hours.ts).

typedef OpeningHoursMap = Map<String, OpeningHoursDay>;

final class OpeningHoursDay {
  const OpeningHoursDay({required this.open, required this.close});

  final String open;
  final String close;
}

const _defaultOpenMinutes = 8 * 60;
const _defaultCloseMinutes = 23 * 60;

const _dayKeys = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const _dayLabelsEs = {
  'sunday': 'Domingo',
  'monday': 'Lunes',
  'tuesday': 'Martes',
  'wednesday': 'Miércoles',
  'thursday': 'Jueves',
  'friday': 'Viernes',
  'saturday': 'Sábado',
};

int parseTimeToMinutes(String time) {
  final parts = time.split(':');
  final h = int.parse(parts[0]);
  final m = parts.length > 1 ? int.parse(parts[1]) : 0;
  return h * 60 + m;
}

String minutesToTimeString(int minutes) {
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

String dayKeyFromDate(DateTime localDate) {
  return _dayKeys[localDate.weekday % 7];
}

String dayKeyFromIsoDate(String isoDate) {
  final parts = isoDate.split('-').map(int.parse).toList();
  return dayKeyFromDate(DateTime(parts[0], parts[1], parts[2]));
}

OpeningHoursMap? openingHoursFromJson(Object? json) {
  if (json is! Map) return null;
  final map = <String, OpeningHoursDay>{};
  for (final entry in json.entries) {
    final key = entry.key.toString();
    final value = entry.value;
    if (value is! Map) continue;
    final open = value['open'];
    final close = value['close'];
    if (open is String && close is String) {
      map[key] = OpeningHoursDay(open: open, close: close);
    }
  }
  return map.isEmpty ? null : map;
}

({int openMinutes, int closeMinutes})? getDayHoursForDate(
  String isoDate,
  OpeningHoursMap? openingHours,
) {
  final dayKey = dayKeyFromIsoDate(isoDate);

  if (openingHours == null) {
    if (dayKey == 'sunday') return null;
    return (openMinutes: _defaultOpenMinutes, closeMinutes: _defaultCloseMinutes);
  }

  if (openingHours.isEmpty) return null;

  final entry = openingHours[dayKey];
  if (entry == null) return null;

  final open = parseTimeToMinutes(entry.open);
  final close = parseTimeToMinutes(entry.close);
  if (close <= open) return null;

  return (openMinutes: open, closeMinutes: close);
}

bool isVenueOpenOnDate(String isoDate, OpeningHoursMap? openingHours) {
  return getDayHoursForDate(isoDate, openingHours) != null;
}

String closedDayMessage(String isoDate, OpeningHoursMap? openingHours) {
  final dayKey = dayKeyFromIsoDate(isoDate);
  final label = _dayLabelsEs[dayKey] ?? dayKey;
  return '$label la sede está cerrada. Elegí otro día.';
}

String hoursRangeLabel(int openMinutes, int closeMinutes) {
  return '${minutesToTimeString(openMinutes)} – ${minutesToTimeString(closeMinutes)}';
}

String? validateTimeWithinDayHours(
  String time,
  int durationMinutes,
  int openMinutes,
  int closeMinutes,
) {
  final start = parseTimeToMinutes(time);
  final end = start + durationMinutes;
  if (start < openMinutes) {
    return 'La hora de inicio no puede ser antes de ${minutesToTimeString(openMinutes)}.';
  }
  if (end > closeMinutes) {
    return 'El bloque termina después del cierre (${minutesToTimeString(closeMinutes)}).';
  }
  return null;
}

/// Ventana UTC para consultar availability en un día local.
({DateTime fromUtc, DateTime toUtc}) availabilityWindowUtcForLocalDate({
  required DateTime localDate,
  OpeningHoursMap? openingHours,
}) {
  final iso = '${localDate.year.toString().padLeft(4, '0')}-'
      '${localDate.month.toString().padLeft(2, '0')}-'
      '${localDate.day.toString().padLeft(2, '0')}';
  final hours = getDayHoursForDate(iso, openingHours);
  if (hours == null) {
    return (
      fromUtc: DateTime.utc(localDate.year, localDate.month, localDate.day, 6),
      toUtc: DateTime.utc(localDate.year, localDate.month, localDate.day, 6),
    );
  }
  return (
    fromUtc: DateTime.utc(
      localDate.year,
      localDate.month,
      localDate.day,
      hours.openMinutes ~/ 60,
      hours.openMinutes % 60,
    ),
    toUtc: DateTime.utc(
      localDate.year,
      localDate.month,
      localDate.day,
      hours.closeMinutes ~/ 60,
      hours.closeMinutes % 60,
    ),
  );
}
