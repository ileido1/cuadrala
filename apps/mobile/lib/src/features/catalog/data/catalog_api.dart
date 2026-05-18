import '../../../core/network/api_client.dart';

abstract interface class CatalogApi {
  Future<Map<String, Object?>> listSportsEnvelope();
  Future<Map<String, Object?>> listCategoriesEnvelope({String? sportId});
}

final class DioCatalogApi implements CatalogApi {
  const DioCatalogApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listSportsEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/sports');
  }

  @override
  Future<Map<String, Object?>> listCategoriesEnvelope({String? sportId}) {
    final query = sportId != null && sportId.isNotEmpty
        ? '?sportId=${Uri.encodeQueryComponent(sportId)}'
        : '';
    return _apiClient.getEnvelopeDataMap('/api/v1/categories$query');
  }
}
