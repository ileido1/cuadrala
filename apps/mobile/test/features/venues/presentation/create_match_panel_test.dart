import 'dart:async';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/core/failures/app_failure.dart';
import 'package:cuadrala_mobile/src/core/theme/app_icons.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/models/player_sport_profile_dto.dart';
import 'package:cuadrala_mobile/src/features/onboarding/data/onboarding_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/court_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/models/venue_dto.dart';
import 'package:cuadrala_mobile/src/features/venues/data/venues_repository.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/create_match_panel.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_cubit.dart';
import 'package:cuadrala_mobile/src/features/venues/presentation/cubit/venue_map_state.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockVenueMapCubit extends MockCubit<VenueMapState>
    implements VenueMapCubit {}

class _MockVenuesRepository extends Mock implements VenuesRepository {}

class _MockMatchesRepository extends Mock implements MatchesRepository {}

class _MockOnboardingRepository extends Mock implements OnboardingRepository {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/// "Hoy" fijo: sábado 1 de junio de 2030.
final _now = DateTime(2030, 6, 1);

const _venueA = VenueDto(
  id: 'venue-1',
  name: 'Club Cuádrala',
  address: 'Av. Principal',
  latitude: 10.48,
  longitude: -66.86,
);

const _venueB = VenueDto(
  id: 'venue-2',
  name: 'Padel Este',
  address: 'Calle 2',
  latitude: 10.49,
  longitude: -66.85,
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

const _profile = PlayerSportProfileDto(
  id: 'profile-1',
  sportId: 'sport-1',
  skillLevel: 3,
  sidePreference: SidePreference.any,
  categoryId: 'cat-1',
  categoryName: 'Primera',
);

final _createdMatch = MatchDetailDto(
  id: 'match-1',
  sportId: 'sport-1',
  categoryId: 'cat-1',
  type: 'REGULAR',
  status: 'OPEN',
  scheduledAt: DateTime.utc(2030, 6, 1, 18),
  pricePerPlayerCents: 750,
  maxParticipants: 4,
  participantCount: 1,
  openSpots: 3,
  courtId: 'court-1',
  clubName: 'Club Cuádrala',
  courtName: 'Pista 1',
  locationLabel: null,
  tournamentId: null,
  participants: const [],
  createdAt: DateTime(2030, 6, 1),
  updatedAt: DateTime(2030, 6, 1),
);

const _loadedMap = VenueMapState(
  status: VenueMapStatus.loaded,
  venues: [_venueA, _venueB],
  filtered: [_venueA, _venueB],
);

//? Envelope de disponibilidad: el id de la cancha vive en `court.id`.
Map<String, Object?> _availability() => {
  'courts': [
    {
      'court': {'id': 'court-1', 'name': 'Pista 1', 'venueId': 'venue-1'},
      'slots': [
        {'scheduledAt': '2030-06-01T18:00:00.000Z', 'isAvailable': true},
      ],
    },
  ],
};

//? Issue #116: create_match_panel.dart no tenía ningún test de widget. Cubre
//? los estados del selector de sedes, la creación del cubit de reserva al
//? elegir sede y el envío completo (éxito → onMatchCreated, error → snackbar).
void main() {
  late _MockVenueMapCubit mapCubit;
  late StreamController<VenueMapState> mapStates;
  late _MockVenuesRepository venues;
  late _MockMatchesRepository matches;
  late _MockOnboardingRepository onboarding;
  late List<String> createdIds;

  setUpAll(() {
    registerFallbackValue(DateTime(2000));
  });

  setUp(() async {
    await getIt.reset();
    venues = _MockVenuesRepository();
    matches = _MockMatchesRepository();
    onboarding = _MockOnboardingRepository();
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
    when(
      () => onboarding.listSportProfiles(),
    ).thenAnswer((_) async => const [_profile]);
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
    ).thenAnswer((_) async => _availability());

    mapCubit = _MockVenueMapCubit();
    mapStates = StreamController<VenueMapState>.broadcast();
    when(() => mapCubit.load()).thenAnswer((_) async {});
    when(() => mapCubit.search(any())).thenReturn(null);
    when(() => mapCubit.selectVenue(any())).thenReturn(null);
    createdIds = [];
  });

  tearDown(() async {
    await mapStates.close();
    await getIt.reset();
  });

  Future<void> pumpPanel(WidgetTester tester, VenueMapState state) async {
    tester.view.physicalSize = const Size(402, 874);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    when(() => mapCubit.state).thenReturn(state);
    whenListen(mapCubit, mapStates.stream, initialState: state);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: BlocProvider<VenueMapCubit>.value(
            value: mapCubit,
            child: CreateMatchPanel(now: _now, onMatchCreated: createdIds.add),
          ),
        ),
      ),
    );
    await tester.pump();
  }

  /// Simula que el VenueMapCubit eligió [venue]; el panel crea su cubit de
  /// reserva real (con repos mockeados) y lo carga.
  Future<void> selectVenue(WidgetTester tester, VenueDto venue) async {
    final next = _loadedMap.copyWith(selectedVenue: venue);
    when(() => mapCubit.state).thenReturn(next);
    mapStates.add(next);
    await tester.pumpAndSettle();
  }

  Future<void> tapVisible(WidgetTester tester, Finder finder) async {
    await tester.ensureVisible(finder);
    await tester.pumpAndSettle();
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  Finder ctaFinder() => find.byWidgetPredicate((w) => w is FilledButton);

  stubCreateMatch() => when(
    () => matches.createMatch(
      sportId: any(named: 'sportId'),
      categoryId: any(named: 'categoryId'),
      type: any(named: 'type'),
      scheduledAt: any(named: 'scheduledAt'),
      courtId: any(named: 'courtId'),
      venueId: any(named: 'venueId'),
      tournamentId: any(named: 'tournamentId'),
      pricePerPlayerCents: any(named: 'pricePerPlayerCents'),
      maxParticipants: any(named: 'maxParticipants'),
      durationMinutes: any(named: 'durationMinutes'),
      notes: any(named: 'notes'),
      affectsElo: any(named: 'affectsElo'),
      gender: any(named: 'gender'),
    ),
  );

  testWidgets('should show header, date strip and spinner when venues load', (
    tester,
  ) async {
    await pumpPanel(
      tester,
      const VenueMapState(status: VenueMapStatus.loading),
    );

    expect(find.text('Crear partida'), findsOneWidget);
    expect(find.text('Hoy'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(ctaFinder(), findsNothing);
  });

  testWidgets('should show the error and retry load when venues fail', (
    tester,
  ) async {
    await pumpPanel(
      tester,
      const VenueMapState(status: VenueMapStatus.failure, error: 'Sin red.'),
    );

    expect(find.text('Sin red.'), findsOneWidget);
    await tester.tap(find.text('Reintentar'));

    verify(() => mapCubit.load()).called(1);
  });

  testWidgets('should show the no-results text when the search is empty', (
    tester,
  ) async {
    await pumpPanel(
      tester,
      const VenueMapState(
        status: VenueMapStatus.loaded,
        venues: [_venueA],
        searchQuery: 'zzz',
      ),
    );

    expect(find.text('Sin resultados para "zzz".'), findsOneWidget);
  });

  testWidgets('should show the fallback notice when nearby search fell back', (
    tester,
  ) async {
    await pumpPanel(tester, _loadedMap.copyWith(fellBackToAll: true));

    expect(
      find.text('No hay sedes cercanas. Mostrando todas.'),
      findsOneWidget,
    );
  });

  testWidgets('should list venues and forward search and taps to the cubit', (
    tester,
  ) async {
    await pumpPanel(tester, _loadedMap);

    expect(find.text('Club Cuádrala'), findsOneWidget);
    expect(find.text('Padel Este'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'padel');
    verify(() => mapCubit.search('padel')).called(1);

    await tapVisible(tester, find.text('Padel Este'));
    verify(() => mapCubit.selectVenue(_venueB)).called(1);
    //? Sin sede elegida todavía no hay cubit de reserva ni footer.
    expect(ctaFinder(), findsNothing);
    verifyNever(() => matches.resolveDefaultSportId());
  });

  testWidgets('should load courts and show the booking footer when a venue '
      'is selected', (tester) async {
    await pumpPanel(tester, _loadedMap);
    await selectVenue(tester, _venueA);

    verify(
      () => venues.listVenueCourts(venueId: 'venue-1', status: 'ACTIVE'),
    ).called(1);
    expect(find.text('Pista 1'), findsOneWidget);
    expect(find.text('Primera'), findsOneWidget);
    expect(find.text('Elige cancha y horario'), findsOneWidget);
    expect(tester.widget<FilledButton>(ctaFinder()).onPressed, isNull);
  });

  testWidgets('should request availability for the chosen day when the date '
      'changes before picking a court', (tester) async {
    await pumpPanel(tester, _loadedMap);
    await selectVenue(tester, _venueA);

    //? El primer lunes de la tira es el 3 de junio de 2030.
    await tapVisible(tester, find.text('LUN').first);
    await tapVisible(tester, find.text('Pista 1'));

    final captured = verify(
      () => venues.getVenueAvailability(
        venueId: 'venue-1',
        from: captureAny(named: 'from'),
        to: any(named: 'to'),
        courtId: 'court-1',
        durationMinutes: any(named: 'durationMinutes'),
        stepMinutes: any(named: 'stepMinutes'),
        sportId: any(named: 'sportId'),
        categoryId: any(named: 'categoryId'),
      ),
    ).captured;
    final from = captured.single as DateTime;
    expect((from.year, from.month, from.day), (2030, 6, 3));
  });

  testWidgets('should create the match and call onMatchCreated when the '
      'player submits a court and slot', (tester) async {
    stubCreateMatch().thenAnswer((_) async => _createdMatch);
    await pumpPanel(tester, _loadedMap);
    await selectVenue(tester, _venueA);

    await tapVisible(tester, find.text('Pista 1'));
    await tapVisible(tester, find.text('18:00 - 19:30'));
    expect(tester.widget<FilledButton>(ctaFinder()).onPressed, isNotNull);
    await tester.tap(ctaFinder());
    await tester.pumpAndSettle();

    verify(
      () => matches.createMatch(
        sportId: 'sport-1',
        categoryId: 'cat-1',
        type: any(named: 'type'),
        scheduledAt: DateTime.parse('2030-06-01T18:00:00.000Z'),
        courtId: 'court-1',
        venueId: 'venue-1',
        tournamentId: any(named: 'tournamentId'),
        pricePerPlayerCents: any(named: 'pricePerPlayerCents'),
        maxParticipants: 4,
        durationMinutes: 90,
        notes: any(named: 'notes'),
        affectsElo: any(named: 'affectsElo'),
        gender: any(named: 'gender'),
      ),
    ).called(1);
    expect(createdIds, ['match-1']);
  });

  testWidgets('should show a snackbar and not call onMatchCreated when the '
      'match creation fails', (tester) async {
    stubCreateMatch().thenThrow(
      const AppFailure(code: 'CANCHA_OCUPADA', message: 'Cancha ocupada.'),
    );
    await pumpPanel(tester, _loadedMap);
    await selectVenue(tester, _venueA);

    await tapVisible(tester, find.text('Pista 1'));
    await tapVisible(tester, find.text('18:00 - 19:30'));
    await tester.tap(ctaFinder());
    await tester.pumpAndSettle();

    expect(find.text('Cancha ocupada.'), findsOneWidget);
    expect(createdIds, isEmpty);
  });

  testWidgets('should close the panel when the close button is tapped', (
    tester,
  ) async {
    when(() => mapCubit.state).thenReturn(_loadedMap);
    whenListen(mapCubit, mapStates.stream, initialState: _loadedMap);
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => Scaffold(
                  body: BlocProvider<VenueMapCubit>.value(
                    value: mapCubit,
                    child: CreateMatchPanel(
                      now: _now,
                      onMatchCreated: createdIds.add,
                    ),
                  ),
                ),
              ),
            ),
            child: const Text('abrir'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('abrir'));
    await tester.pumpAndSettle();
    expect(find.byType(CreateMatchPanel), findsOneWidget);

    await tester.tap(find.byIcon(AppIcons.close));
    await tester.pumpAndSettle();

    expect(find.byType(CreateMatchPanel), findsNothing);
  });
}
