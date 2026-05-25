// Horarios de sede (paridad con apps/web/src/lib/venue-opening-hours.ts).

import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

typedef OpeningHoursMap = Map<String, OpeningHoursDay>;

final class OpeningHoursDay {
  const OpeningHoursDay({required this.open, required this.close});

  final String open;
  final String close;
}

const _defaultOpenMinutes = 8 * 60;
const _defaultCloseMinutes = 23 * 60;
const _defaultVenueTimezone = 'America/Caracas';

bool _timezoneDataLoaded = false;

void ensureOpeningHoursTimezoneData() {
  if (_timezoneDataLoaded) return;
  tz_data.initializeTimeZones();
  _timezoneDataLoaded = true;
}

const _dayKeysList = [
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
  return _dayKeysList[localDate.weekday % 7];
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

tz.Location _venueLocation(String venueTimezone) {
  ensureOpeningHoursTimezoneData();
  try {
    return tz.getLocation(venueTimezone);
  } catch (_) {
    return tz.getLocation(_defaultVenueTimezone);
  }
}

tz.TZDateTime _tzAtMinutes(
  tz.Location location,
  int year,
  int month,
  int day,
  int totalMinutes,
) {
  return tz.TZDateTime(
    location,
    year,
    month,
    day,
    totalMinutes ~/ 60,
    totalMinutes % 60,
  );
}

/// Ventana UTC para availability: día calendario + horario en timezone de sede.
({DateTime fromUtc, DateTime toUtc}) availabilityWindowUtcForLocalDate({
  required DateTime localDate,
  OpeningHoursMap? openingHours,
  String venueTimezone = _defaultVenueTimezone,
}) {
  final iso = '${localDate.year.toString().padLeft(4, '0')}-'
      '${localDate.month.toString().padLeft(2, '0')}-'
      '${localDate.day.toString().padLeft(2, '0')}';
  final hours = getDayHoursForDate(iso, openingHours);
  final location = _venueLocation(venueTimezone);
  final y = localDate.year;
  final m = localDate.month;
  final d = localDate.day;

  if (hours == null) {
    final closed = _tzAtMinutes(location, y, m, d, 6 * 60);
    return (fromUtc: closed.toUtc(), toUtc: closed.toUtc());
  }

  final fromLocal = _tzAtMinutes(location, y, m, d, hours.openMinutes);
  final toLocal = _tzAtMinutes(location, y, m, d, hours.closeMinutes);
  return (fromUtc: fromLocal.toUtc(), toUtc: toLocal.toUtc());
}

/// Primer inicio de bloque seleccionable (UTC) si la fecha es hoy en sede.
DateTime earliestSelectableSlotUtc({
  required DateTime localDate,
  OpeningHoursMap? openingHours,
  required String venueTimezone,
  required int blockDurationMinutes,
}) {
  final window = availabilityWindowUtcForLocalDate(
    localDate: localDate,
    openingHours: openingHours,
    venueTimezone: venueTimezone,
  );

  if (blockDurationMinutes <= 0) return window.fromUtc;

  final location = _venueLocation(venueTimezone);
  final now = tz.TZDateTime.now(location);
  final isToday = localDate.year == now.year &&
      localDate.month == now.month &&
      localDate.day == now.day;

  if (!isToday) return window.fromUtc;

  final iso = '${localDate.year.toString().padLeft(4, '0')}-'
      '${localDate.month.toString().padLeft(2, '0')}-'
      '${localDate.day.toString().padLeft(2, '0')}';
  final hours = getDayHoursForDate(iso, openingHours);
  final openMinutes = hours?.openMinutes ?? _defaultOpenMinutes;
  final closeMinutes = hours?.closeMinutes ?? _defaultCloseMinutes;

  final nowMinutes = now.hour * 60 + now.minute;
  if (nowMinutes <= openMinutes) return window.fromUtc;

  final elapsed = nowMinutes - openMinutes;
  final blocksPassed = (elapsed / blockDurationMinutes).ceil();
  var nextStartMinutes = openMinutes + blocksPassed * blockDurationMinutes;

  if (nextStartMinutes + blockDurationMinutes > closeMinutes) {
    nextStartMinutes = closeMinutes;
  }

  final nextLocal = _tzAtMinutes(
    location,
    localDate.year,
    localDate.month,
    localDate.day,
    nextStartMinutes,
  );
  final nextUtc = nextLocal.toUtc();
  return nextUtc.isAfter(window.fromUtc) ? nextUtc : window.fromUtc;
}

/// Hora del slot en timezone de la sede (para etiquetas en UI).
String formatSlotTimeInVenueTimezone(
  DateTime scheduledAtUtc, {
  String venueTimezone = _defaultVenueTimezone,
}) {
  final location = _venueLocation(venueTimezone);
  final local = tz.TZDateTime.from(scheduledAtUtc.toUtc(), location);
  return '${local.hour.toString().padLeft(2, '0')}:'
      '${local.minute.toString().padLeft(2, '0')}';
}
