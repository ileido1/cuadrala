// Cálculo de precio por franjas (paridad con pricing.service.ts del API).

import 'package:timezone/timezone.dart' as tz;

import 'opening_hours.dart';

final class CourtPricingTierDto {
  const CourtPricingTierDto({
    required this.startTime,
    required this.endTime,
    required this.pricePerHourCents,
    this.label,
  });

  final String startTime;
  final String endTime;
  final int pricePerHourCents;
  final String? label;

  static CourtPricingTierDto? fromJson(Object? json) {
    if (json is! Map) return null;
    final start = json['startTime'];
    final end = json['endTime'];
    final price = json['pricePerHourCents'];
    if (start is! String || end is! String || price is! num) return null;
    return CourtPricingTierDto(
      startTime: start,
      endTime: end,
      pricePerHourCents: price.toInt(),
      label: json['label'] as String?,
    );
  }
}

CourtPricingTierDto? _findActiveTier(
  int minutesFromMidnight,
  List<CourtPricingTierDto> tiers,
) {
  for (final tier in tiers) {
    final start = parseTimeToMinutes(tier.startTime);
    final end = parseTimeToMinutes(tier.endTime);
    if (minutesFromMidnight >= start && minutesFromMidnight < end) {
      return tier;
    }
  }
  return null;
}

int? resolvePricePerHourCentsAtMinutes({
  required int minutesFromMidnight,
  required int? basePricePerHourCents,
  required List<CourtPricingTierDto> pricingTiers,
}) {
  final active = _findActiveTier(minutesFromMidnight, pricingTiers);
  if (active != null) return active.pricePerHourCents;
  return basePricePerHourCents;
}

int _minutesForPricingSegment({
  required int minutesFromMidnight,
  required int remainingMinutes,
  required List<CourtPricingTierDto> pricingTiers,
}) {
  final active = _findActiveTier(minutesFromMidnight, pricingTiers);
  if (active != null) {
    final end = parseTimeToMinutes(active.endTime);
    return (end - minutesFromMidnight).clamp(0, remainingMinutes);
  }

  int? nextTierStart;
  for (final tier in pricingTiers) {
    final start = parseTimeToMinutes(tier.startTime);
    if (start > minutesFromMidnight) {
      if (nextTierStart == null || start < nextTierStart) {
        nextTierStart = start;
      }
    }
  }

  if (nextTierStart != null) {
    return (nextTierStart - minutesFromMidnight).clamp(0, remainingMinutes);
  }

  return (24 * 60 - minutesFromMidnight).clamp(0, remainingMinutes);
}

/// Total del bloque en centavos según franjas y duración.
int? calculateReservationTotalCents({
  required int? basePricePerHourCents,
  required List<CourtPricingTierDto> pricingTiers,
  required DateTime scheduledAtUtc,
  required int durationMinutes,
  required String venueTimezone,
}) {
  if (durationMinutes <= 0) return null;
  final base = basePricePerHourCents != null && basePricePerHourCents > 0
      ? basePricePerHourCents
      : null;
  if (base == null && pricingTiers.isEmpty) return null;

  ensureOpeningHoursTimezoneData();
  tz.Location location;
  try {
    location = tz.getLocation(venueTimezone);
  } catch (_) {
    location = tz.getLocation('America/Caracas');
  }

  var totalCents = 0;
  var remaining = durationMinutes;
  var cursorMs = scheduledAtUtc.toUtc().millisecondsSinceEpoch;

  while (remaining > 0) {
    final cursor = tz.TZDateTime.fromMillisecondsSinceEpoch(
      location,
      cursorMs,
    );
    final minutesOfDay = cursor.hour * 60 + cursor.minute;
    final rate = resolvePricePerHourCentsAtMinutes(
      minutesFromMidnight: minutesOfDay,
      basePricePerHourCents: base,
      pricingTiers: pricingTiers,
    );
    if (rate == null) return null;

    final segmentMinutes = _minutesForPricingSegment(
      minutesFromMidnight: minutesOfDay,
      remainingMinutes: remaining,
      pricingTiers: pricingTiers,
    );
    if (segmentMinutes <= 0) return null;

    totalCents += ((rate * segmentMinutes) / 60).round();
    remaining -= segmentMinutes;
    cursorMs += segmentMinutes * 60 * 1000;
  }

  return totalCents;
}

/// Reparte el total del bloque entre jugadores sin cobrar menos que el bloque.
/// Mismo monto por jugador (modelo de partida): redondeo hacia arriba en centavos.
int splitBlockTotalPerPlayerCents({
  required int blockTotalCents,
  required int playerCount,
}) {
  if (blockTotalCents <= 0 || playerCount <= 0) return 0;
  return (blockTotalCents + playerCount - 1) ~/ playerCount;
}
