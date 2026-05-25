import '../network/api_client.dart';

abstract interface class ExchangeRatesApi {
  Future<Map<String, Object?>> listByCountryEnvelope({
    required String countryCode,
  });
}

final class DioExchangeRatesApi implements ExchangeRatesApi {
  DioExchangeRatesApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listByCountryEnvelope({
    required String countryCode,
  }) {
    return _apiClient.getJson(
      '/api/v1/countries/$countryCode/exchange-rates',
    );
  }
}
