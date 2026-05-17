import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/models/currency_code.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/models/reservation_payment_summary_dto.dart';

void main() {
  group('ReservationPaymentSummaryDto.fromJson', () {
    test('should parse MCP fields from API summary', () {
      final summary = ReservationPaymentSummaryDto.fromJson({
        'reservationId': 'res-1',
        'totalAmountCents': 10000,
        'paidAmountCents': 2500,
        'paymentStatus': 'PARTIAL',
        'pricingCurrency': 'USD',
        'pendingCount': 1,
        'paidAmount': {
          'amountMinor': '2500',
          'currencyCode': 'USD',
        },
        'reservationTotalAmount': {
          'amountMinor': '10000',
          'currencyCode': 'USD',
        },
        'items': [
          {'id': 'tx-1', 'status': 'PENDING', 'amountTotal': '75'},
        ],
      });

      expect(summary.pricingCurrency, CurrencyCode.usd);
      expect(summary.pendingAmountCents, 7500);
      expect(summary.findPendingTransactionId(), 'tx-1');
      expect(summary.canRegisterPayment, isTrue);
    });
  });
}
