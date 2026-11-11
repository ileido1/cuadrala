import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/slot_info.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_booking_state.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/venue_booking_screen.dart';

import '../../../helpers/golden_harness.dart';

class _MockVenueBookingCubit extends MockCubit<VenueBookingState>
    implements VenueBookingCubit {}

/// "Hoy" fijo de los goldens; la tira de fechas arranca en este día.
final _now = DateTime(2030, 6, 1);

const _venue = VenueDto(
  id: 'venue-1',
  name: 'Club Cuádrala',
  address: 'Av. Principal de Las Mercedes, Caracas',
  latitude: 10.48,
  longitude: -66.86,
);

CourtDto _court(String id, String name) => CourtDto(
      id: id,
      venueId: 'venue-1',
      name: name,
      sportType: 'PADEL',
      indoor: true,
      lighting: true,
      status: 'ACTIVE',
      createdAt: DateTime(2030, 1, 1),
      pricePerHourCents: 2000,
      durationMinutes: 90,
    );

final _loadingState = VenueBookingState(
  venue: _venue,
  selectedDate: _now,
  loading: true,
);

//? Franjas en convención wall-clock-as-UTC: hora local de la sede en UTC.
final _loadedState = VenueBookingState(
  venue: _venue,
  selectedDate: _now,
  courts: [_court('court-1', 'Pista 1'), _court('court-2', 'Pista 2')],
  sportId: 'sport-1',
  slotsByCourtId: const {
    'court-1': [
      SlotInfo(scheduledAt: '2030-06-01T18:00:00.000Z', isAvailable: true),
      SlotInfo(
        scheduledAt: '2030-06-01T19:30:00.000Z',
        isAvailable: false,
        reason: 'OCCUPIED_MATCH',
      ),
      SlotInfo(scheduledAt: '2030-06-01T21:00:00.000Z', isAvailable: true),
    ],
  },
  selectedCourtId: 'court-1',
  selectedSlot: '2030-06-01T18:00:00.000Z',
  selectedCategoryId: 'cat-1',
  playerCategoryLabel: 'Primera',
);

//? Issue #116: venue_booking_screen.dart ya tenía tests de comportamiento pero
//? ningún golden. Cubre la carga y el formulario cargado con cancha y horario
//? elegidos; `now` fija la tira de fechas para que el golden no cambie cada día.
void main() {
  late _MockVenueBookingCubit cubit;

  setUpAll(loadGoldenFonts);

  setUp(() async {
    //? Sin ExchangeRatesRepository registrado, loadExchangeRatesSafelySV
    //? devuelve una lista vacía en lugar de llamar a la red.
    await getIt.reset();
    cubit = _MockVenueBookingCubit();
  });

  tearDown(() async {
    await getIt.reset();
  });

  Future<void> pumpScreen(
    WidgetTester tester, {
    required VenueBookingState state,
    required Brightness brightness,
  }) async {
    when(() => cubit.state).thenReturn(state);
    whenListen(cubit, const Stream<VenueBookingState>.empty());
    await pumpGolden(
      tester,
      brightness: brightness,
      child: BlocProvider<VenueBookingCubit>.value(
        value: cubit,
        child: VenueBookingScreen(now: _now),
      ),
    );
    await tester.pump(const Duration(milliseconds: 100));
  }

  for (final brightness in Brightness.values) {
    testWidgets('reserva cargando ${brightness.name}', (tester) async {
      await pumpScreen(tester, state: _loadingState, brightness: brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/venue_booking_screen_loading_${brightness.name}.png',
        ),
      );
    });

    testWidgets('reserva cargada ${brightness.name}', (tester) async {
      await pumpScreen(tester, state: _loadedState, brightness: brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/venue_booking_screen_loaded_${brightness.name}.png',
        ),
      );
    });
  }
}
