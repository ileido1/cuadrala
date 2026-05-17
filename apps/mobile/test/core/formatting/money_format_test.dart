import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_format.dart';
import 'package:cuadrala_mobile/src/core/models/currency_code.dart';

void main() {
  group('formatMoneyFromMinor', () {
    test('should format BS with two decimals', () {
      expect(
        formatMoneyFromMinor(12550, CurrencyCode.bs),
        'Bs. 125.50',
      );
    });

    test('should format USD', () {
      expect(
        formatMoneyFromMinor(9900, CurrencyCode.usd),
        'US\$ 99.00',
      );
    });
  });

  group('CurrencyCode.resolve', () {
    test('should prefer pricingCurrency', () {
      expect(
        CurrencyCode.resolve(pricingCurrency: 'USD', displayCurrency: 'BS'),
        CurrencyCode.usd,
      );
    });
  });

  group('parseMoneyInputToMinor', () {
    test('should parse comma decimal', () {
      expect(parseMoneyInputToMinor('125,50'), 12550);
    });
  });
}
