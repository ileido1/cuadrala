import '../../../core/network/api_client.dart';

abstract interface class QuickMatchApi {
  Future<Map<String, Object?>> getCurrent();
  Future<Map<String, Object?>> start(Map<String, Object?> body);
  Future<Map<String, Object?>> confirmProposal({
    Map<String, Object?> body = const {},
  });
  Future<Map<String, Object?>> dismissProposal();
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
  Future<Map<String, Object?>> confirmProposal({
    Map<String, Object?> body = const {},
  }) => _client.postJson('/api/v1/quick-match/proposal/confirm', body: body);
  @override
  Future<Map<String, Object?>> dismissProposal() =>
      _client.postJson('/api/v1/quick-match/proposal/dismiss', body: const {});
  @override
  Future<void> cancel() => _client.deleteNoContent('/api/v1/quick-match');
}
