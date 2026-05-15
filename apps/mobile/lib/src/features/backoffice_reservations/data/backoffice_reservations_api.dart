import '../../../core/network/api_client.dart';

abstract class BackofficeReservationsApi {
  /// Endpoint unificado de bookings (reemplaza listReservationsEnvelope).
  Future<Map<String, Object?>> listBookingsEnvelope({
    required String venueId,
    required String from,
    required String to,
  });

  Future<Map<String, Object?>> listReservationsEnvelope({
    required String venueId,
    required String from,
    required String to,
  });

  Future<Map<String, Object?>> createReservationEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
    required String type,
    String? notes,
  });

  Future<Map<String, Object?>> cancelReservationEnvelope({
    required String venueId,
    required String reservationId,
  });

  Future<Map<String, Object?>> blockSlotEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
  });

  Future<Map<String, Object?>> unblockSlotEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
  });
}

final class DioBackofficeReservationsApi implements BackofficeReservationsApi {
  DioBackofficeReservationsApi({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<Map<String, Object?>> listBookingsEnvelope({
    required String venueId,
    required String from,
    required String to,
  }) {
    // Endpoint unificado de bookings (GET /venues/:venueId/bookings)
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/bookings',
      queryParameters: {'from': from, 'to': to, 'limit': '100'},
    );
  }

  @override
  Future<Map<String, Object?>> listReservationsEnvelope({
    required String venueId,
    required String from,
    required String to,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/reservations',
      queryParameters: {'from': from, 'to': to},
    );
  }

  @override
  Future<Map<String, Object?>> createReservationEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
    required String type,
    String? notes,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/reservations',
      method: 'POST',
      body: {
        'courtId': courtId,
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
        'type': type,
        if (notes != null) 'notes': notes,
      },
    );
  }

  @override
  Future<Map<String, Object?>> cancelReservationEnvelope({
    required String venueId,
    required String reservationId,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/reservations/$reservationId',
      method: 'DELETE',
    );
  }

  @override
  Future<Map<String, Object?>> blockSlotEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts/$courtId/slots/block',
      method: 'POST',
      body: {
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
      },
    );
  }

  @override
  Future<Map<String, Object?>> unblockSlotEnvelope({
    required String venueId,
    required String courtId,
    required String date,
    required String startTime,
    required String endTime,
  }) {
    return _apiClient.getEnvelopeDataMap(
      '/api/v1/venues/$venueId/courts/$courtId/slots/block',
      method: 'DELETE',
      queryParameters: {
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
      },
    );
  }
}