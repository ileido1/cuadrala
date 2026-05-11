import 'models/reservation_dto.dart';

abstract class IBackofficeReservationsRepository {
  Future<List<ReservationDto>> listReservations({
    required String venueId,
    required DateTime from,
    required DateTime to,
  });

  Future<ReservationDto> createReservation({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
    required ReservationType type,
    String? notes,
  });

  Future<void> cancelReservation({
    required String venueId,
    required String reservationId,
  });

  Future<ReservationDto> blockSlot({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  });

  Future<void> unblockSlot({
    required String venueId,
    required String courtId,
    required DateTime date,
    required String startTime,
    required String endTime,
  });
}