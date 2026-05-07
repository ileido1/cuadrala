import '../../../core/network/api_client.dart';

abstract class VenuesApi {
  Future<Map<String, Object?>> listVenuesEnvelope({
    int page,
    int limit,
    String? near,
    int? radiusKm,
  });

  Future<Map<String, Object?>> listVenueCourtsEnvelope({
    required String venueId,
  });

  Future<Map<String, Object?>> getVenueAvailabilityEnvelope({
    required String venueId,
    String? courtId,
    required String fromIso,
    required String toIso,
    int? durationMinutes,
    int? stepMinutes,
    String? sportId,
    String? categoryId,
  });
}

final class DioVenuesApi implements VenuesApi {
  DioVenuesApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listVenuesEnvelope({
    int page = 1,
    int limit = 50,
    String? near,
    int? radiusKm,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues',
      queryParameters: {
        'page': page,
        'limit': limit,
        if (near != null) 'near': near,
        if (radiusKm != null) 'radiusKm': radiusKm,
      },
    );
  }

  @override
  Future<Map<String, Object?>> listVenueCourtsEnvelope({required String venueId}) {
    return _apiClient.getEnvelopeDataMap('/api/v1/venues/$venueId/courts');
  }

  @override
  Future<Map<String, Object?>> getVenueAvailabilityEnvelope({
    required String venueId,
    String? courtId,
    required String fromIso,
    required String toIso,
    int? durationMinutes,
    int? stepMinutes,
    String? sportId,
    String? categoryId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/availability',
      queryParameters: {
        if (courtId != null) 'courtId': courtId,
        'from': fromIso,
        'to': toIso,
        if (durationMinutes != null) 'durationMinutes': durationMinutes,
        if (stepMinutes != null) 'stepMinutes': stepMinutes,
        if (sportId != null) 'sportId': sportId,
        if (categoryId != null) 'categoryId': categoryId,
      },
    );
  }
}

