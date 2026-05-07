import '../../../core/failures/app_failure.dart';
import 'models/court_dto.dart';
import 'models/venue_dto.dart';
import 'venues_api.dart';

final class VenuesRepository {
  VenuesRepository({required VenuesApi venuesApi}) : _venuesApi = venuesApi;

  final VenuesApi _venuesApi;

  Future<List<VenueDto>> listVenues({
    int page = 1,
    int limit = 100,
    String? near,
    int? radiusKm,
  }) async {
    final data = await _venuesApi.listVenuesEnvelope(
      page: page,
      limit: limit,
      near: near,
      radiusKm: radiusKm,
    );

    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }

    return itemsRaw.whereType<Map<String, Object?>>().map(VenueDto.fromJson).toList();
  }

  Future<List<CourtDto>> listVenueCourts({required String venueId}) async {
    final data = await _venuesApi.listVenueCourtsEnvelope(venueId: venueId);
    final itemsRaw = data['items'];
    if (itemsRaw is! List) {
      throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
    }
    return itemsRaw.whereType<Map<String, Object?>>().map(CourtDto.fromJson).toList();
  }

  Future<Map<String, Object?>> getVenueAvailability({
    required String venueId,
    required DateTime from,
    required DateTime to,
    String? courtId,
    int durationMinutes = 90,
    int stepMinutes = 30,
    String? sportId,
    String? categoryId,
  }) async {
    final data = await _venuesApi.getVenueAvailabilityEnvelope(
      venueId: venueId,
      courtId: courtId,
      fromIso: from.toIso8601String(),
      toIso: to.toIso8601String(),
      durationMinutes: durationMinutes,
      stepMinutes: stepMinutes,
      sportId: sportId,
      categoryId: categoryId,
    );

    if (data['venueId'] is String && data['courts'] is List) {
      return data;
    }
    throw const AppFailure(code: 'INVALID_RESPONSE', message: 'Respuesta inválida del servidor.');
  }
}

