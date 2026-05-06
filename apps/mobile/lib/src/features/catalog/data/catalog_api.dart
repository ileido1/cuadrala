import '../../../core/network/api_client.dart';

abstract interface class CatalogApi {
  Future<Map<String, Object?>> listSportsEnvelope();
  Future<Map<String, Object?>> listCategoriesEnvelope();
}

final class DioCatalogApi implements CatalogApi {
  const DioCatalogApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listSportsEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/sports');
  }

  @override
  Future<Map<String, Object?>> listCategoriesEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/categories');
  }
}
