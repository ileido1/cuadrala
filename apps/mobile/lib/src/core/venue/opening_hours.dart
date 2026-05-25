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

final class _dayKeys {
  static const sunday = 'sunday';
  static const monday = 'monday';
  static const tuesday = 'tuesday';
  static const wednesday = 'wednesday';
  static const thursday = 'thursday';
  static const friday = 'friday';
  static const saturday = 'saturday';
}

const _dayKeysList = [
  _dayKeys.sunday,
  _dayKeys.monday,
  _dayKeys.tuesday,
  _dayKeys.wednesday,
  _dayKeys.thursday,
  _dayKeys.friday,
  _dayKeys.saturday,
];

const _dayLabelsEs = {
  _dayKeys.sunday: 'Domingo',
  _dayKeys.monday: 'Lunes',
  _dayKeys.tuesday: 'Martes',
  _dayKeys.wednesday: 'Miércoles',
  _dayKeys.thursday: 'Jueves',
  _dayKeys.friday: 'Viernes',
  _dayKeys.saturday: 'Sábado',
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
    if (dayKey == _dayKeys.sunday) return null;
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
