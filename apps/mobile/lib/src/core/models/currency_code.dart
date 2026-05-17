/// Monedas soportadas (alineado con API `CurrencyCode`).
enum CurrencyCode {
  bs('BS'),
  usd('USD'),
  eur('EUR');

  const CurrencyCode(this.apiValue);

  final String apiValue;

  static CurrencyCode resolve({
    String? pricingCurrency,
    String? displayCurrency,
  }) {
    final CODE = pricingCurrency ?? displayCurrency ?? 'BS';
    return fromApiValue(CODE);
  }

  static CurrencyCode fromApiValue(String? value) {
    switch (value?.toUpperCase()) {
      case 'USD':
        return CurrencyCode.usd;
      case 'EUR':
        return CurrencyCode.eur;
      case 'BS':
      default:
        return CurrencyCode.bs;
    }
  }

  String get symbol {
    switch (this) {
      case CurrencyCode.bs:
        return 'Bs.';
      case CurrencyCode.usd:
        return 'US\$';
      case CurrencyCode.eur:
        return '€';
    }
  }
}
