import 'models/quick_match_search_dto.dart';
import 'quick_match_api.dart';

class QuickMatchRepository {
  const QuickMatchRepository(this._api);
  final QuickMatchApi _api;

  Future<QuickMatchSearchDto?> current() async {
    final payload = await _api.getCurrent();
    if (payload == null || payload.isEmpty) {
      return null;
    }
    return QuickMatchSearchDto.fromJson(payload);
  }

  Future<QuickMatchSearchDto> start(Map<String, Object?> preferences) =>
      _fromEnvelope(_api.start(preferences));
  Future<QuickMatchSearchDto> confirmProposal({
    QuickMatchVenueOptionDto? option,
  }) {
    final body = option == null
        ? const <String, Object?>{}
        : <String, Object?>{
            'venueId': option.venueId,
            'courtId': option.courtId,
            'scheduledAt': option.scheduledAt.toUtc().toIso8601String(),
          };
    return _fromEnvelope(_api.confirmProposal(body: body));
  }

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
