import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/models/currency_code.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/models/booking_item.dart';

void main() {
  group('BookingItem.fromJson', () {
    test('should parse pricingCurrency and minor amounts as strings', () {
      final BOOKING = BookingItem.fromJson({
        'id': 'b1',
        'venueId': 'v1',
        'courtId': 'c1',
        'courtName': 'Cancha 1',
        'type': 'DIRECT',
        'scheduledAt': '2026-05-20T10:00:00.000Z',
        'durationMinutes': 60,
        'status': 'CONFIRMED',
        'pricingCurrency': 'USD',
        'totalAmountMinor': '10000',
        'paidAmountMinor': '2500',
        'paymentStatus': 'PARTIAL',
      });

      expect(BOOKING.currencyCode, CurrencyCode.usd);
      expect(BOOKING.totalAmountCents, 10000);
      expect(BOOKING.paidAmountCents, 2500);
      expect(BOOKING.formatPendingAmount(), 'US\$ 75.00');
    });
  });
}
