import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/backoffice_reservations_api.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/backoffice_reservations_repository.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/models/reservation_dto.dart';

class _MockBackofficeReservationsApi extends Mock implements BackofficeReservationsApi {}

void main() {
  group('BackofficeReservationsRepository', () {
    late _MockBackofficeReservationsApi api;
    late BackofficeReservationsRepository repository;

    setUp(() {
      api = _MockBackofficeReservationsApi();
      repository = BackofficeReservationsRepository(api: api);
    });

    ReservationDto sampleReservation() {
      return const ReservationDto(
        id: 'res-1',
        venueId: 'venue-1',
        courtId: 'court-1',
        courtName: 'Cancha 1',
        type: ReservationType.reservation,
        date: '2026-05-15',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Partido privado',
        matchId: null,
      );
    }

    test('listReservations returns list of reservations from API', () async {
      when(() => api.listReservationsEnvelope(
        venueId: 'venue-1',
        from: '2026-05-01',
        to: '2026-05-31',
      )).thenAnswer((_) async => {
        'items': [
          {
            'id': 'res-1',
            'venueId': 'venue-1',
            'courtId': 'court-1',
            'courtName': 'Cancha 1',
            'type': 'RESERVATION',
            'date': '2026-05-15',
            'startTime': '10:00',
            'endTime': '11:00',
            'notes': null,
            'matchId': null,
          },
        ],
      });

      final result = await repository.listReservations(
        venueId: 'venue-1',
        from: DateTime(2026, 5, 1),
        to: DateTime(2026, 5, 31),
      );

      expect(result, hasLength(1));
      expect(result.first.id, 'res-1');
      expect(result.first.courtName, 'Cancha 1');
      expect(result.first.type, ReservationType.reservation);
    });

    test('listReservations returns empty list when no items', () async {
      when(() => api.listReservationsEnvelope(
        venueId: 'venue-1',
        from: '2026-05-01',
        to: '2026-05-31',
      )).thenAnswer((_) async => {'items': []});

      final result = await repository.listReservations(
        venueId: 'venue-1',
        from: DateTime(2026, 5, 1),
        to: DateTime(2026, 5, 31),
      );

      expect(result, isEmpty);
    });

    test('createReservation delegates to API and returns ReservationDto', () async {
      when(() => api.createReservationEnvelope(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: '2026-05-20',
        startTime: '14:00',
        endTime: '15:00',
        type: 'RESERVATION',
        notes: 'Partido privado',
      )).thenAnswer((_) async => {
        'id': 'res-new',
        'venueId': 'venue-1',
        'courtId': 'court-1',
        'type': 'RESERVATION',
        'date': '2026-05-20',
        'startTime': '14:00',
        'endTime': '15:00',
        'notes': 'Partido privado',
        'matchId': null,
      });

      final result = await repository.createReservation(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
        type: ReservationType.reservation,
        notes: 'Partido privado',
      );

      expect(result.id, 'res-new');
      expect(result.type, ReservationType.reservation);
    });

    test('cancelReservation delegates to API', () async {
      when(() => api.cancelReservationEnvelope(
        venueId: 'venue-1',
        reservationId: 'res-1',
      )).thenAnswer((_) async => {'success': true});

      await repository.cancelReservation(venueId: 'venue-1', reservationId: 'res-1');

      verify(() => api.cancelReservationEnvelope(
        venueId: 'venue-1',
        reservationId: 'res-1',
      )).called(1);
    });

    test('blockSlot delegates to API and returns ReservationDto', () async {
      when(() => api.blockSlotEnvelope(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: '2026-05-20',
        startTime: '14:00',
        endTime: '15:00',
      )).thenAnswer((_) async => {
        'id': 'block-1',
        'venueId': 'venue-1',
        'courtId': 'court-1',
        'type': 'BLOCKED',
        'date': '2026-05-20',
        'startTime': '14:00',
        'endTime': '15:00',
        'notes': null,
        'matchId': null,
      });

      final result = await repository.blockSlot(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
      );

      expect(result.type, ReservationType.blocked);
    });

    test('unblockSlot delegates to API', () async {
      when(() => api.unblockSlotEnvelope(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: '2026-05-20',
        startTime: '14:00',
        endTime: '15:00',
      )).thenAnswer((_) async => {'success': true});

      await repository.unblockSlot(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
      );

      verify(() => api.unblockSlotEnvelope(
        venueId: 'venue-1',
        courtId: 'court-1',
        date: '2026-05-20',
        startTime: '14:00',
        endTime: '15:00',
      )).called(1);
    });
  });
}