import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/player_sport_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/create_match_panel.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';

import '../../../helpers/golden_harness.dart';

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

/// "Hoy" fijo de los goldens; la tira de fechas arranca en este día.
final _now = DateTime(2030, 6, 1);

const _venueA = VenueDto(
  id: 'venue-1',
  name: 'Club Cuádrala',
  address: 'Av. Principal de Las Mercedes, Caracas',
  latitude: 10.48,
  longitude: -66.86,
  distanceKm: 1.2,
  averageRating: 4.6,
);

const _venueB = VenueDto(
  id: 'venue-2',
  name: 'Padel Este',
  address: 'Calle 2, La Castellana',
  latitude: 10.49,
  longitude: -66.85,
  distanceKm: 3.4,
);

final _court = CourtDto(
  id: 'court-1',
  venueId: 'venue-1',
  name: 'Pista 1',
  sportType: 'PADEL',
  indoor: true,
  lighting: true,
  status: 'ACTIVE',
  createdAt: DateTime(2030, 1, 1),
  pricePerHourCents: 2000,
  durationMinutes: 90,
);

const _loadedMap = VenueMapState(
  status: VenueMapStatus.loaded,
  venues: [_venueA, _venueB],
  filtered: [_venueA, _venueB],
);

//? Issue #116: create_match_panel.dart no tenía goldens. Cubre la lista de
//? sedes sin elegir y una sede elegida con cancha y horario; `now` fija la
//? tira de fechas para que el golden no cambie cada día.
void main() {
  late _MockVenueMapCubit mapCubit;
  late StreamController<VenueMapState> mapStates;

  setUpAll(() async {
    registerFallbackValue(DateTime(2000));
    await loadGoldenFonts();
  });

  setUp(() async {
    await getIt.reset();
    final venues = _MockVenuesRepository();
    final matches = _MockMatchesRepository();
    final onboarding = _MockOnboardingRepository();
    //? Sin ExchangeRatesRepository registrado, las tasas caen a lista vacía.
    getIt
      ..registerSingleton<VenuesRepository>(venues)
      ..registerSingleton<MatchesRepository>(matches)
      ..registerSingleton<OnboardingRepository>(onboarding);
    when(
      () => matches.resolveDefaultSportId(),
    ).thenAnswer((_) async => 'sport-1');
    when(
      () => venues.listVenueCourts(
        venueId: any(named: 'venueId'),
        status: any(named: 'status'),
      ),
    ).thenAnswer((_) async => [_court]);
    when(() => onboarding.listSportProfiles()).thenAnswer(
      (_) async => const [
        PlayerSportProfileDto(
          id: 'profile-1',
          sportId: 'sport-1',
          skillLevel: 3,
          sidePreference: SidePreference.any,
          categoryId: 'cat-1',
          categoryName: 'Primera',
        ),
      ],
    );
    //? Franjas en convención wall-clock-as-UTC: hora local de la sede en UTC.
    when(
      () => venues.getVenueAvailability(
        venueId: any(named: 'venueId'),
        from: any(named: 'from'),
        to: any(named: 'to'),
        courtId: any(named: 'courtId'),
        durationMinutes: any(named: 'durationMinutes'),
        stepMinutes: any(named: 'stepMinutes'),
        sportId: any(named: 'sportId'),
        categoryId: any(named: 'categoryId'),
      ),
    ).thenAnswer(
      (_) async => {
        'courts': [
          {
            'court': {'id': 'court-1'},
            'slots': [
              {'scheduledAt': '2030-06-01T18:00:00.000Z', 'isAvailable': true},
              {
                'scheduledAt': '2030-06-01T19:30:00.000Z',
                'isAvailable': false,
                'reason': 'OCCUPIED_MATCH',
              },
              {'scheduledAt': '2030-06-01T21:00:00.000Z', 'isAvailable': true},
            ],
          },
        ],
      },
    );

    mapCubit = _MockVenueMapCubit();
    mapStates = StreamController<VenueMapState>.broadcast();
    when(() => mapCubit.state).thenReturn(_loadedMap);
    whenListen(mapCubit, mapStates.stream, initialState: _loadedMap);
  });

  tearDown(() async {
    await mapStates.close();
    await getIt.reset();
  });

  Future<void> pumpPanel(WidgetTester tester, Brightness brightness) async {
    await pumpGolden(
      tester,
      brightness: brightness,
      child: Scaffold(
        body: BlocProvider<VenueMapCubit>.value(
          value: mapCubit,
          child: CreateMatchPanel(now: _now, onMatchCreated: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final brightness in Brightness.values) {
    testWidgets('crear partida con sedes ${brightness.name}', (tester) async {
      await pumpPanel(tester, brightness);

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/create_match_panel_venues_${brightness.name}.png',
        ),
      );
    });

    testWidgets('crear partida con sede elegida ${brightness.name}', (
      tester,
    ) async {
      await pumpPanel(tester, brightness);
      final selected = _loadedMap.copyWith(selectedVenue: _venueA);
      when(() => mapCubit.state).thenReturn(selected);
      mapStates.add(selected);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Pista 1'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('18:00 - 19:30'));
      await tester.pumpAndSettle();

      await expectLater(
        find.byKey(goldenKey),
        matchesGoldenFile(
          'goldens/create_match_panel_selected_${brightness.name}.png',
        ),
      );
    });
  }
}
