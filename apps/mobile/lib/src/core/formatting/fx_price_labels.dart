import '../data/exchange_rates_repository.dart';
import '../di/service_locator.dart';
import '../models/currency_code.dart';
import 'money_conversion.dart';
import 'money_format.dart';

/// Etiqueta Bs secundaria a partir de un monto minor y tasas del día.
String? secondaryBsLabelSV({
  required int primaryMinor,
  required CurrencyCode primaryCurrency,
  required List<ExchangeRateRow> rates,
  required String effectiveDateIso,
}) {
  if (primaryCurrency == CurrencyCode.bs) return null;
  final rate = pickExchangeRateForDateSV(
    rates,
    primaryCurrency,
    effectiveDateIso,
  );
  if (rate == null) return null;
  final bsMinor = toBsMinorSV(primaryMinor, primaryCurrency, rate.rateToBs);
  return formatMoneyFromMinor(bsMinor, CurrencyCode.bs);
}

/// Carga tasas de cambio sin fallar la pantalla si el endpoint no responde.
Future<List<ExchangeRateRow>> loadExchangeRatesSafelySV({
  String countryCode = 'VE',
}) async {
  try {
    return await getIt<ExchangeRatesRepository>().listByCountry(
      countryCode: countryCode,
    );
  } catch (_) {
    return const [];
  }
}
