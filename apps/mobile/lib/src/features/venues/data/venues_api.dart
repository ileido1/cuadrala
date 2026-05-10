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
    String? status,
  });

  Future<Map<String, Object?>> createCourtEnvelope({
    required String venueId,
    required String name,
    String? sportType,
    bool? indoor,
    bool? lighting,
    String? surfaceType,
  });

  Future<Map<String, Object?>> updateCourtEnvelope({
    required String venueId,
    required String courtId,
    String? name,
    String? sportType,
    bool? indoor,
    bool? lighting,
    String? surfaceType,
  });

  Future<Map<String, Object?>> cancelCourtEnvelope({
    required String venueId,
    required String courtId,
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
  Future<Map<String, Object?>> listVenueCourtsEnvelope({required String venueId, String? status}) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts',
      queryParameters: status != null ? {'status': status} : null,
    );
  }

  @override
  Future<Map<String, Object?>> createCourtEnvelope({
    required String venueId,
    required String name,
    String? sportType,
    bool? indoor,
    bool? lighting,
    String? surfaceType,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts',
      method: 'POST',
      body: {
        'name': name,
        if (sportType != null) 'sportType': sportType,
        if (indoor != null) 'indoor': indoor,
        if (lighting != null) 'lighting': lighting,
        if (surfaceType != null) 'surfaceType': surfaceType,
      },
    );
  }

  @override
  Future<Map<String, Object?>> updateCourtEnvelope({
    required String venueId,
    required String courtId,
    String? name,
    String? sportType,
    bool? indoor,
    bool? lighting,
    String? surfaceType,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts/$courtId',
      method: 'PUT',
      body: {
        if (name != null) 'name': name,
        if (sportType != null) 'sportType': sportType,
        if (indoor != null) 'indoor': indoor,
        if (lighting != null) 'lighting': lighting,
        if (surfaceType != null) 'surfaceType': surfaceType,
      },
    );
  }

  @override
  Future<Map<String, Object?>> cancelCourtEnvelope({
    required String venueId,
    required String courtId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts/$courtId',
      method: 'DELETE',
    );
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

