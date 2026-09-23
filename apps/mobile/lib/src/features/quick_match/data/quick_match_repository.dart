import 'models/quick_match_search_dto.dart';
import 'quick_match_api.dart';

class QuickMatchRepository {
  const QuickMatchRepository(this._api);
  final QuickMatchApi _api;

  Future<QuickMatchSearchDto?> current() async {
    final data = await _api.getCurrent();
    final payload = data['data'] is Map<String, Object?>
        ? data['data'] as Map<String, Object?>
        : data;
    return payload.isEmpty ? null : QuickMatchSearchDto.fromJson(payload);
  }

  Future<QuickMatchSearchDto> start(Map<String, Object?> preferences) =>
      _fromEnvelope(_api.start(preferences));
  Future<QuickMatchSearchDto> confirmProposal() =>
      _fromEnvelope(_api.confirmProposal());
  Future<QuickMatchSearchDto> dismissProposal() =>
      _fromEnvelope(_api.dismissProposal());
  Future<void> cancel() => _api.cancel();

  Future<QuickMatchSearchDto> _fromEnvelope(
    Future<Map<String, Object?>> request,
  ) async {
    final data = await request;
    final payload = data['data'] is Map<String, Object?>
        ? data['data'] as Map<String, Object?>
        : data;
    return QuickMatchSearchDto.fromJson(payload);
  }
}
