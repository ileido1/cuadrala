import '../failures/app_failure.dart';
import '../formatting/money_conversion.dart';
import 'exchange_rates_api.dart';

class ExchangeRatesRepository {
  ExchangeRatesRepository({required ExchangeRatesApi exchangeRatesApi})
      : _exchangeRatesApi = exchangeRatesApi;

  final ExchangeRatesApi _exchangeRatesApi;

  Future<List<ExchangeRateRow>> listByCountry({
    required String countryCode,
  }) async {
    final body = await _exchangeRatesApi.listByCountryEnvelope(
      countryCode: countryCode,
    );
    final data = body['data'];
    if (data is! Map<String, Object?>) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }
    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      return const [];
    }

    return itemsRaw.whereType<Map<String, Object?>>().map((json) {
      final currency = json['currency'] as String? ?? 'BS';
      final rateRaw = json['rateToBs'];
      final rate = rateRaw is num
          ? rateRaw.toDouble()
          : double.tryParse('$rateRaw') ?? 1.0;
      return ExchangeRateRow(
        currency: currency,
        rateToBs: rate,
        effectiveDate: json['effectiveDate'] as String?,
      );
    }).toList();
  }
}
