import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/backoffice_reservations_repository_interface.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/data/models/reservation_dto.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/presentation/cubit/backoffice_reservations_cubit.dart';
import 'package:cuadrala_mobile/src/features/backoffice_reservations/presentation/cubit/backoffice_reservations_state.dart';

class _MockBackofficeReservationsRepository extends Mock
    implements IBackofficeReservationsRepository {}

void main() {
  group('BackofficeReservationsCubit', () {
    late _MockBackofficeReservationsRepository repo;

    setUp(() {
      repo = _MockBackofficeReservationsRepository();
    });

    ReservationDto reservation({
      String id = 'res-1',
      ReservationType type = ReservationType.reservation,
    }) {
      return ReservationDto(
        id: id,
        venueId: 'venue-1',
        courtId: 'court-1',
        courtName: 'Cancha 1',
        type: type,
        date: '2026-05-15',
        startTime: '10:00',
        endTime: '11:00',
        notes: null,
        matchId: null,
      );
    }

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'load: loading → loaded with reservations',
      build: () {
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => [
          reservation(),
          reservation(id: 'res-2', type: ReservationType.blocked),
        ]);
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loaded)
            .having((s) => s.reservations.length, 'reservations.length', 2),
      ],
    );

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'load: loading → failure on error',
      build: () {
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenThrow(Exception('Network error'));
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.failure)
            .having((s) => s.error, 'error', isNotNull),
      ],
    );

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'createReservation: saving → loading → loaded on success',
      build: () {
        when(() => repo.createReservation(
          venueId: 'venue-1',
          courtId: 'court-1',
          date: any(named: 'date'),
          startTime: '14:00',
          endTime: '15:00',
          type: ReservationType.reservation,
          notes: any(named: 'notes'),
        )).thenAnswer((_) async => reservation(id: 'res-new'));
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => [reservation(id: 'res-new')]);
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.createReservation(
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
        type: ReservationType.reservation,
        notes: 'Partido',
      ),
      expect: () => [
        // Step 1: saving = true (no status change to avoid duplicating load state)
        isA<BackofficeReservationsState>()
            .having((s) => s.saving, 'saving', true),
        // Step 2: load() is called, emits loading
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        // Step 3: load() completes with new data
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loaded)
            .having((s) => s.reservations.length, 'reservations.length', 1),
      ],
    );

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'cancelReservation: saving → loading → loaded on success',
      build: () {
        when(() => repo.cancelReservation(
          venueId: 'venue-1',
          reservationId: 'res-1',
        )).thenAnswer((_) async {});
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => []);
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.cancelReservation(reservationId: 'res-1'),
      expect: () => [
        isA<BackofficeReservationsState>()
            .having((s) => s.saving, 'saving', true),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loaded)
            .having((s) => s.reservations, 'reservations', isEmpty),
      ],
    );

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'blockSlot: saving → loading → loaded on success',
      build: () {
        when(() => repo.blockSlot(
          venueId: 'venue-1',
          courtId: 'court-1',
          date: any(named: 'date'),
          startTime: '14:00',
          endTime: '15:00',
        )).thenAnswer((_) async => reservation(id: 'block-1', type: ReservationType.blocked));
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => [reservation(id: 'block-1', type: ReservationType.blocked)]);
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.blockSlot(
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
      ),
      expect: () => [
        isA<BackofficeReservationsState>()
            .having((s) => s.saving, 'saving', true),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loaded)
            .having((s) => s.reservations.length, 'reservations.length', 1),
      ],
    );

    blocTest<BackofficeReservationsCubit, BackofficeReservationsState>(
      'unblockSlot: saving → loading → loaded on success',
      build: () {
        when(() => repo.unblockSlot(
          venueId: 'venue-1',
          courtId: 'court-1',
          date: any(named: 'date'),
          startTime: '14:00',
          endTime: '15:00',
        )).thenAnswer((_) async {});
        when(() => repo.listReservations(
          venueId: 'venue-1',
          from: any(named: 'from'),
          to: any(named: 'to'),
        )).thenAnswer((_) async => []);
        return BackofficeReservationsCubit(
          repository: repo,
          venueId: 'venue-1',
        );
      },
      act: (cubit) => cubit.unblockSlot(
        courtId: 'court-1',
        date: DateTime(2026, 5, 20),
        startTime: '14:00',
        endTime: '15:00',
      ),
      expect: () => [
        isA<BackofficeReservationsState>()
            .having((s) => s.saving, 'saving', true),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loading),
        isA<BackofficeReservationsState>()
            .having((s) => s.status, 'status', BackofficeReservationsStatus.loaded)
            .having((s) => s.reservations, 'reservations', isEmpty),
      ],
    );

    test('goToNextWeek updates weekStart and weekEnd', () {
      final cubit = BackofficeReservationsCubit(
        repository: repo,
        venueId: 'venue-1',
      );

      // Initial state should be current week
      final initialWeekStart = cubit.state.weekStart;

      cubit.goToNextWeek();

      expect(cubit.state.weekStart.isAfter(initialWeekStart), isTrue);
    });

    test('goToPreviousWeek updates weekStart and weekEnd', () {
      final cubit = BackofficeReservationsCubit(
        repository: repo,
        venueId: 'venue-1',
      );

      final initialWeekStart = cubit.state.weekStart;

      cubit.goToPreviousWeek();

      expect(cubit.state.weekStart.isBefore(initialWeekStart), isTrue);
    });
  });
}