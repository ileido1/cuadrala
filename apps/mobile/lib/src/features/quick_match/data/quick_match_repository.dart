import 'dart:async';

import 'models/quick_match_search_dto.dart';
import 'quick_match_api.dart';

class QuickMatchRepository {
  QuickMatchRepository(this._api);
  final QuickMatchApi _api;

  //? Avisa cuando la búsqueda cambió (iniciar, confirmar, descartar, salir).
  //? El banner de inicio sigue montado al volver con go(home) y, sin esto,
  //? mostraba la búsqueda vieja como "activa" indefinidamente.
  final _changes = StreamController<void>.broadcast();
  Stream<void> get changes => _changes.stream;

  Future<T> _notifying<T>(Future<T> request) async {
    final result = await request;
    _changes.add(null);
    return result;
  }

  Future<QuickMatchSearchDto?> current() async {
    final payload = await _api.getCurrent();
    if (payload == null || payload.isEmpty) {
      return null;
    }
    return QuickMatchSearchDto.fromJson(payload);
  }

  Future<QuickMatchSearchDto> start(Map<String, Object?> preferences) =>
      _notifying(_fromEnvelope(_api.start(preferences)));
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
    return _notifying(_fromEnvelope(_api.confirmProposal(body: body)));
  }

  Future<QuickMatchSearchDto> dismissProposal() =>
      _notifying(_fromEnvelope(_api.dismissProposal()));
  Future<void> cancel() => _notifying(_api.cancel());

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
