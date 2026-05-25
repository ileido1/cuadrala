import '../models/currency_code.dart';

/// Tasa del API: Bs por 1 unidad mayor (ej. 50 = Bs 50 por US$ 1).
int rateBsMinorPerMajorUnit(double rateToBs) {
  return (rateToBs * 100).round();
}

int toBsMinorSV(int amountMinor, CurrencyCode currency, double rateToBs) {
  if (currency == CurrencyCode.bs) {
    return amountMinor;
  }
  final rateMinor = rateBsMinorPerMajorUnit(rateToBs);
  return ((BigInt.from(amountMinor) * BigInt.from(rateMinor) + BigInt.from(50)) ~/
          BigInt.from(100))
      .toInt();
}

int fromBsMinorSV(int bsMinor, CurrencyCode target, double rateToBs) {
  if (target == CurrencyCode.bs) {
    return bsMinor;
  }
  final rateMinor = rateBsMinorPerMajorUnit(rateToBs);
  return ((BigInt.from(bsMinor) * BigInt.from(100) +
              BigInt.from(rateMinor) ~/ BigInt.two) ~/
          BigInt.from(rateMinor))
      .toInt();
}

/// Convierte un monto minor entre monedas usando tasas a Bs del día.
int convertMinorBetweenCurrenciesSV(
  int amountMinor,
  CurrencyCode from,
  CurrencyCode to,
  double fromRateToBs,
  double toRateToBs,
) {
  if (from == to) {
    return amountMinor;
  }
  final bsMinor = toBsMinorSV(amountMinor, from, fromRateToBs);
  return fromBsMinorSV(bsMinor, to, toRateToBs);
}

String localCalendarDateIsoSV(DateTime scheduledAt, {String? timezone}) {
  // Sin paquete intl: fecha calendario del instante en hora local del dispositivo.
  // timezone se reserva para paridad futura con schedule web (IANA sede).
  final local = scheduledAt.toLocal();
  return '${local.year.toString().padLeft(4, '0')}-'
      '${local.month.toString().padLeft(2, '0')}-'
      '${local.day.toString().padLeft(2, '0')}';
}

final class ExchangeRateRow {
  const ExchangeRateRow({
    required this.currency,
    required this.rateToBs,
    this.effectiveDate,
  });

  final String currency;
  final double rateToBs;
  final String? effectiveDate;
}

ExchangeRateRow? pickExchangeRateForDateSV(
  List<ExchangeRateRow> rates,
  CurrencyCode currency,
  String effectiveDateIso,
) {
  if (currency == CurrencyCode.bs) {
    return const ExchangeRateRow(currency: 'BS', rateToBs: 1);
  }

  final code = currency.apiValue;
  final forCurrency =
      rates.where((r) => r.currency.toUpperCase() == code).toList();
  if (forCurrency.isEmpty) {
    return null;
  }

  for (final r in forCurrency) {
    final date = r.effectiveDate?.length != null && r.effectiveDate!.length >= 10
        ? r.effectiveDate!.substring(0, 10)
        : r.effectiveDate;
    if (date == effectiveDateIso) {
      return r;
    }
  }

  final sorted = [...forCurrency]
    ..sort((a, b) => (b.effectiveDate ?? '').compareTo(a.effectiveDate ?? ''));
  return sorted.isEmpty ? null : sorted.first;
}
