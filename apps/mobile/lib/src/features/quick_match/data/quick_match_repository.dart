import 'models/quick_match_search_dto.dart';
import 'quick_match_api.dart';

final class QuickMatchRepository {
  const QuickMatchRepository(this._api);
  final QuickMatchApi _api;

  Future<QuickMatchSearchDto?> current() async {
    final data = await _api.getCurrent();
    return data.isEmpty ? null : QuickMatchSearchDto.fromJson(data);
  }

  Future<QuickMatchSearchDto> start(Map<String, Object?> preferences) async {
    final data = await _api.start(preferences);
    final payload = data['data'] is Map<String, Object?>
        ? data['data'] as Map<String, Object?>
        : data;
    return QuickMatchSearchDto.fromJson(payload);
  }

  Future<void> cancel() => _api.cancel();
}
