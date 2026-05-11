import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/availability/data/availability_repository.dart';
import 'package:cuadrala_mobile/src/features/availability/presentation/cubit/availability_cubit.dart';
import 'package:cuadrala_mobile/src/features/availability/presentation/cubit/availability_state.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/user_availability_dto.dart';

class _MockAvailabilityRepository extends Mock implements AvailabilityRepository {}

void main() {
  group('AvailabilityCubit', () {
    late _MockAvailabilityRepository repo;

    setUp(() {
      repo = _MockAvailabilityRepository();
    });

    UserAvailabilityDto slot({
      DayOfWeek day = DayOfWeek.monday,
      AvailabilitySlot slot = AvailabilitySlot.morning,
    }) {
      return UserAvailabilityDto(dayOfWeek: day, slot: slot);
    }

    blocTest<AvailabilityCubit, AvailabilityState>(
      'load: loading → loaded with slots',
      build: () {
        when(() => repo.listAvailability()).thenAnswer(
          (_) async => [
            slot(day: DayOfWeek.monday),
            slot(day: DayOfWeek.tuesday, slot: AvailabilitySlot.evening),
          ],
        );
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading)
            .having((s) => s.error, 'error', isNull),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loaded)
            .having((s) => s.slots.length, 'slots.length', 2),
      ],
    );

    blocTest<AvailabilityCubit, AvailabilityState>(
      'load: loading → failure on error',
      build: () {
        when(() => repo.listAvailability()).thenThrow(Exception('Network error'));
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.failure)
            .having((s) => s.error, 'error', isNotNull),
      ],
    );

    blocTest<AvailabilityCubit, AvailabilityState>(
      'addSlot: agrega slot y persiste',
      build: () {
        when(() => repo.listAvailability()).thenAnswer((_) async => []);
        when(() => repo.putAvailability(any())).thenAnswer(
          (_) async => [slot(day: DayOfWeek.monday)],
        );
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.addSlot(DayOfWeek.monday, AvailabilitySlot.morning);
      },
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loaded)
            .having((s) => s.slots, 'slots', isEmpty),
        isA<AvailabilityState>()
            .having((s) => s.saving, 'saving', true)
            .having((s) => s.error, 'error', isNull),
        isA<AvailabilityState>()
            .having((s) => s.saving, 'saving', false)
            .having((s) => s.slots.length, 'slots.length', 1),
      ],
    );

    blocTest<AvailabilityCubit, AvailabilityState>(
      'addSlot: no agrega duplicado (contieneSlot retorna true)',
      build: () {
        when(() => repo.listAvailability()).thenAnswer(
          (_) async => [slot(day: DayOfWeek.monday)],
        );
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.addSlot(DayOfWeek.monday, AvailabilitySlot.morning);
      },
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loaded)
            .having((s) => s.slots.length, 'slots.length', 1),
      ],
      verify: (_) {
        verifyNever(() => repo.putAvailability(any()));
      },
    );

    blocTest<AvailabilityCubit, AvailabilityState>(
      'removeSlot: elimina slot y persiste',
      build: () {
        when(() => repo.listAvailability()).thenAnswer(
          (_) async => [slot(day: DayOfWeek.monday)],
        );
        when(() => repo.putAvailability(any())).thenAnswer(
          (_) async => [],
        );
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.removeSlot(DayOfWeek.monday, AvailabilitySlot.morning);
      },
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loaded)
            .having((s) => s.slots.length, 'slots.length', 1),
        isA<AvailabilityState>()
            .having((s) => s.saving, 'saving', true),
        isA<AvailabilityState>()
            .having((s) => s.saving, 'saving', false)
            .having((s) => s.slots, 'slots', isEmpty),
      ],
    );

    blocTest<AvailabilityCubit, AvailabilityState>(
      'removeSlot: persiste error → mantiene slots y muestra error',
      build: () {
        when(() => repo.listAvailability()).thenAnswer(
          (_) async => [slot(day: DayOfWeek.monday)],
        );
        when(() => repo.putAvailability(any())).thenThrow(Exception('Save failed'));
        return AvailabilityCubit(repository: repo);
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.removeSlot(DayOfWeek.monday, AvailabilitySlot.morning);
      },
      expect: () => [
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loading),
        isA<AvailabilityState>()
            .having((s) => s.status, 'status', AvailabilityStatus.loaded)
            .having((s) => s.slots.length, 'slots.length', 1),
        isA<AvailabilityState>().having((s) => s.saving, 'saving', true),
        isA<AvailabilityState>()
            .having((s) => s.saving, 'saving', false)
            .having((s) => s.error, 'error', isNotNull),
      ],
    );

    test('containsSlot retorna true cuando el par existe', () {
      final state = AvailabilityState(
        status: AvailabilityStatus.loaded,
        slots: [slot(day: DayOfWeek.monday, slot: AvailabilitySlot.morning)],
      );
      final cubit = AvailabilityCubit(repository: repo);
      // Override state via emit for testing purposes
      cubit.emit(state);
      expect(cubit.containsSlot(DayOfWeek.monday, AvailabilitySlot.morning), isTrue);
    });

    test('containsSlot retorna false cuando el par no existe', () {
      final state = AvailabilityState(
        status: AvailabilityStatus.loaded,
        slots: [slot(day: DayOfWeek.monday, slot: AvailabilitySlot.morning)],
      );
      final cubit = AvailabilityCubit(repository: repo);
      cubit.emit(state);
      expect(cubit.containsSlot(DayOfWeek.monday, AvailabilitySlot.evening), isFalse);
      expect(cubit.containsSlot(DayOfWeek.tuesday, AvailabilitySlot.morning), isFalse);
    });
  });
}
