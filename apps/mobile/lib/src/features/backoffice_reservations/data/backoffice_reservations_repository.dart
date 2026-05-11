import '../../../core/failures/app_failure.dart';
import 'backoffice_reservations_api.dart';
import 'backoffice_reservations_repository_interface.dart';
import 'models/reservation_dto.dart';

class BackofficeReservationsRepository implements IBackofficeReservationsRepository {
  BackofficeReservationsRepository({required BackofficeReservationsApi api})
      : _api = api;

  final BackofficeReservationsApi _api;

  String _dateToString(DateTime date) =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  Future<List<ReservationDto>> listReservations({
    required String venueId,
    required DateTime from,
    required DateTime to,
  }) async {
    final data = await _api.listReservationsEnvelope(
      venueId: venueId,
      from: _dateToString(from),
      to: _dateToString(to),
    );

    final items = data['items'];
    if (items is! List) {
      throw const AppFailure(
        code: 'INVALID_RESPONSE',
        message: 'Respuesta inválida del servidor.',
      );
    }

    return items
        .whereType<Map<String, Object?>>()
        .map(ReservationDto.fromJson)
        .toList();
  }

  Future<ReservationDto> createReservation({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
    required ReservationType type,
    String? notes,
  }) async {
    final data = await _api.createReservationEnvelope(
      venueId: venueId,
      courtId: courtId,
      date: _dateToString(date),
      startTime: startTime,
      endTime: endTime,
      type: type.value,
      notes: notes,
    );

    return ReservationDto.fromJson(data);
  }

  Future<void> cancelReservation({
    required String venueId,
    required String reservationId,
  }) async {
    await _api.cancelReservationEnvelope(
      venueId: venueId,
      reservationId: reservationId,
    );
  }

  Future<ReservationDto> blockSlot({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  }) async {
    final data = await _api.blockSlotEnvelope(
      venueId: venueId,
      courtId: courtId,
      date: _dateToString(date),
      startTime: startTime,
      endTime: endTime,
    );

    return ReservationDto.fromJson(data);
  }

  Future<void> unblockSlot({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  }) async {
    await _api.unblockSlotEnvelope(
      venueId: venueId,
      courtId: courtId,
      date: _dateToString(date),
      startTime: startTime,
      endTime: endTime,
    );
  }
}