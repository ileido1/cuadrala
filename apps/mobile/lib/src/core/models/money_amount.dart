import 'currency_code.dart';

/// Monto monetario en unidades menores (centavos / céntimos).
final class MoneyAmount {
  const MoneyAmount({
    required this.amountMinor,
    required this.currency,
  });

  final int amountMinor;
  final CurrencyCode currency;

  static MoneyAmount? tryFromJson(Object? json) {
    if (json is! Map<String, Object?>) return null;
    final MINOR_RAW = json['amountMinor'];
    final CURRENCY_RAW = json['currencyCode'] as String?;
    if (MINOR_RAW == null || CURRENCY_RAW == null) return null;

    final MINOR = MINOR_RAW is String
        ? int.tryParse(MINOR_RAW)
        : (MINOR_RAW as num?)?.toInt();
    if (MINOR == null) return null;

    return MoneyAmount(
      amountMinor: MINOR,
      currency: CurrencyCode.fromApiValue(CURRENCY_RAW),
    );
  }
}
