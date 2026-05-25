import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/venue/court_pricing.dart';

void main() {
  group('calculateReservationTotalCents', () {
    test('should use tier rate when slot starts inside tier', () {
      const tiers = [
        CourtPricingTierDto(
          startTime: '08:00',
          endTime: '18:00',
          pricePerHourCents: 20000,
        ),
        CourtPricingTierDto(
          startTime: '18:00',
          endTime: '23:00',
          pricePerHourCents: 30000,
        ),
      ];

      // 12:00 America/Caracas = 16:00 UTC (VET UTC-4, May no DST)
      final atNoon = DateTime.utc(2026, 5, 25, 16, 0);
      final dayTotal = calculateReservationTotalCents(
        basePricePerHourCents: 10000,
        pricingTiers: tiers,
        scheduledAtUtc: atNoon,
        durationMinutes: 90,
        venueTimezone: 'America/Caracas',
      );

      expect(dayTotal, 30000);
    });

    test('should ceil per-player cents so block is not undercharged', () {
      // 25 USD/h × 90 min = 3750 cents; ÷4 con ceil = 938 c/u (3752 ≥ 3750)
      expect(
        splitBlockTotalPerPlayerCents(
          blockTotalCents: 3750,
          playerCount: 4,
        ),
        938,
      );
      expect(938 * 4, greaterThanOrEqualTo(3750));
    });

    test('should return null when no base and no tiers', () {
      final total = calculateReservationTotalCents(
        basePricePerHourCents: null,
        pricingTiers: const [],
        scheduledAtUtc: DateTime.utc(2026, 5, 25, 16, 0),
        durationMinutes: 60,
        venueTimezone: 'America/Caracas',
      );

      expect(total, isNull);
    });
  });
}
