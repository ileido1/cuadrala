import '../../../core/network/api_client.dart';

abstract interface class QuickMatchApi {
  Future<Map<String, Object?>> getCurrent();
  Future<Map<String, Object?>> start(Map<String, Object?> body);
  Future<void> cancel();
}

final class DioQuickMatchApi implements QuickMatchApi {
  const DioQuickMatchApi(this._client);
  final ApiClient _client;
  @override
  Future<Map<String, Object?>> getCurrent() =>
      _client.getEnvelopeDataMap('/api/v1/quick-match');
  @override
  Future<Map<String, Object?>> start(Map<String, Object?> body) =>
      _client.postJson('/api/v1/quick-match', body: body);
  @override
  Future<void> cancel() => _client.deleteNoContent('/api/v1/quick-match');
}
