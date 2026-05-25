import 'package:flutter_test/flutter_test.dart';
import 'package:cuadrala_mobile/src/core/formatting/money_conversion.dart';
import 'package:cuadrala_mobile/src/core/models/currency_code.dart';

void main() {
  group('convertMinorBetweenCurrenciesSV', () {
    test('should convert USD to BS using rates', () {
      expect(
        convertMinorBetweenCurrenciesSV(
          10000,
          CurrencyCode.usd,
          CurrencyCode.bs,
          50,
          1,
        ),
        500000,
      );
    });

    test('should return same amount when currencies match', () {
      expect(
        convertMinorBetweenCurrenciesSV(
          1500,
          CurrencyCode.usd,
          CurrencyCode.usd,
          50,
          1,
        ),
        1500,
      );
    });
  });

  group('pickExchangeRateForDateSV', () {
    test('should pick exact date rate', () {
      final picked = pickExchangeRateForDateSV(
        const [
          ExchangeRateRow(
            currency: 'USD',
            rateToBs: 40,
            effectiveDate: '2026-05-10',
          ),
          ExchangeRateRow(
            currency: 'USD',
            rateToBs: 50,
            effectiveDate: '2026-05-17',
          ),
        ],
        CurrencyCode.usd,
        '2026-05-17',
      );
      expect(picked?.rateToBs, 50);
    });
  });
}
