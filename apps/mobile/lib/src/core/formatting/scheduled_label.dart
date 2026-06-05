String shortDateLabel(DateTime dt, {DateTime? now}) {
  final n = now ?? DateTime.now();
  final d1 = DateTime(dt.year, dt.month, dt.day);
  final d0 = DateTime(n.year, n.month, n.day);
  final diffDays = d1.difference(d0).inDays;

  if (diffDays == 0) return 'HOY';
  if (diffDays == 1) return 'MAÑANA';

  const weekdays = <String>['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  // DateTime.weekday: Mon=1 ... Sun=7
  return weekdays[dt.weekday - 1];
}

String formatTimeHm(DateTime dt) {
  final h = dt.hour.toString().padLeft(2, '0');
  final m = dt.minute.toString().padLeft(2, '0');
  return '$h:$m';
}

const _monthsEs = <String>[
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

/// Fecha compacta para bloques de tarjeta (p. ej. `02 Jun`).
String compactCalendarDate(DateTime dt) {
  final day = dt.day.toString().padLeft(2, '0');
  return '$day ${_monthsEs[dt.month - 1]}';
}
