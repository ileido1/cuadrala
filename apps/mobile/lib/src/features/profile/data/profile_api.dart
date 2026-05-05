import '../../../core/network/api_client.dart';

abstract interface class ProfileApi {
  Future<Map<String, Object?>> getMeEnvelope();
}

final class DioProfileApi implements ProfileApi {
  const DioProfileApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> getMeEnvelope() {
    return _apiClient.getEnvelopeDataMap('/api/v1/users/me');
  }
}
