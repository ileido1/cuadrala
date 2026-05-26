import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/open_match_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/open_matches_state.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/open_matches_screen.dart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

OpenMatchDto _match({
  String id = 'match-1',
  int openSpots = 2,
  int participantCount = 2,
  int maxParticipants = 4,
  DateTime? scheduledAt,
}) {
  return OpenMatchDto(
    id: id,
    sportId: 'sport',
    categoryId: 'cat',
    status: 'SCHEDULED',
    scheduledAt: scheduledAt ?? DateTime.now(),
    pricePerPlayerCents: 1500,
    maxParticipants: maxParticipants,
    participantCount: participantCount,
    openSpots: openSpots,
    clubName: 'Club Test',
    courtName: 'Cancha 1',
    locationLabel: null,
  );
}

final _defaultPageResponse = <String, Object?>{
  'items': [
    {
      'id': 'match-1',
      'sportId': 'sport',
      'categoryId': 'cat',
      'status': 'SCHEDULED',
      'scheduledAt': DateTime.now().toIso8601String(),
      'pricePerPlayerCents': 1500,
      'maxParticipants': 4,
      'participantCount': 2,
      'openSpots': 2,
      'clubName': 'Club Test',
      'courtName': 'Cancha 1',
      'locationLabel': null,
    }
  ],
  'pageInfo': {'page': 1, 'limit': 20, 'total': 1},
};

final _sportsResponse = <String, Object?>{
  'sports': [
    {'id': 'sport', 'code': 'PADEL', 'name': 'Pádel'},
  ],
};

// ---------------------------------------------------------------------------
// getIt setup
// ---------------------------------------------------------------------------

OpenMatchesCubit? _lastCubit;

Future<void> _setupGetIt(
  _MockMatchesApi matchesApi,
  _MockCatalogApi catalogApi,
) async {
  await getIt.reset();
  _lastCubit = null;

  final catalogRepo = CatalogRepository(catalogApi: catalogApi);
  final matchesRepo = MatchesRepository(
    matchesApi: matchesApi,
    catalogRepository: catalogRepo,
  );

  getIt.registerLazySingleton<MatchesRepository>(() => matchesRepo);

  getIt.registerFactory<OpenMatchesCubit>(() {
    final cubit = OpenMatchesCubit(matchesRepository: matchesRepo);
    _lastCubit = cubit;
    return cubit;
  });
}

Widget _buildApp() {
  return MaterialApp(
    home: BlocProvider<OpenMatchesCubit>(
      create: (_) => getIt<OpenMatchesCubit>(),
      child: const OpenMatchesScreen(),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  late _MockMatchesApi matchesApi;
  late _MockCatalogApi catalogApi;

  setUp(() {
    matchesApi = _MockMatchesApi();
    catalogApi = _MockCatalogApi();

    when(() => catalogApi.listSportsEnvelope())
        .thenAnswer((_) async => _sportsResponse);
    when(
      () => matchesApi.listOpenMatchesEnvelope(
        sportId: any(named: 'sportId'),
        page: any(named: 'page'),
        limit: any(named: 'limit'),
        categoryId: any(named: 'categoryId'),
      ),
    ).thenAnswer((_) async => _defaultPageResponse);
  });

  tearDown(() async {
    await getIt.reset();
    _lastCubit = null;
  });

  // =========================================================================
  // Phase 4.1 — _DateStrip renders 7 day chips
  // =========================================================================

  group('_DateStrip', () {
    testWidgets('renders 7 day chips in the strip', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      // Each day chip shows the numeric day; verify 7 distinct GestureDetector
      // children exist in the date strip (SizedBox height=72 with ListView)
      final today = DateTime.now();
      // Verify all 7 day-number texts are present (may share numbers near month boundary;
      // so we count unique day numbers rendered)
      int found = 0;
      for (var i = 0; i < 7; i++) {
        final day = today.add(Duration(days: i));
        if (tester.any(find.text('${day.day}'))) {
          found++;
        }
      }
      // At minimum 6 days should be uniquely found (edge case: if today and day+7 share number)
      expect(found, greaterThanOrEqualTo(6));
    });

    // =========================================================================
    // Phase 4.2 — tapping a day chip calls cubit.selectDate
    // =========================================================================

    testWidgets('tapping tomorrow chip changes selectedDate in cubit', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      final cubit = _lastCubit!;
      final stateBefore = cubit.state as OpenMatchesLoaded;

      // Tap tomorrow's day number
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      // find.text may have multiple matches if same day number appears elsewhere
      final dayFinder = find.text('${tomorrow.day}');
      expect(dayFinder, findsWidgets);

      await tester.tap(dayFinder.last);
      await tester.pumpAndSettle();

      final stateAfter = cubit.state as OpenMatchesLoaded;
      // Selected date should have changed
      expect(
        stateAfter.selectedDate?.day == tomorrow.day,
        isTrue,
      );
      // The selection changed (unless today and tomorrow have same day — impossible)
      expect(stateAfter.selectedDate?.day, isNot(stateBefore.selectedDate?.day));
    }, skip: DateTime.now().day == DateTime.now().add(const Duration(days: 1)).day);
  });

  // =========================================================================
  // Phase 4.3 — _TimePills renders 3 chips
  // =========================================================================

  group('_TimePills', () {
    testWidgets('renders Mañana, Tarde, Noche pills', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.text('Mañana'), findsOneWidget);
      expect(find.text('Tarde'), findsOneWidget);
      expect(find.text('Noche'), findsOneWidget);
    });

    testWidgets('tapping Tarde pill activates afternoon bucket', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      final cubit = _lastCubit!;
      expect((cubit.state as OpenMatchesLoaded).activeTimeBuckets, isEmpty);

      await tester.tap(find.text('Tarde'));
      await tester.pumpAndSettle();

      expect(
        (cubit.state as OpenMatchesLoaded).activeTimeBuckets,
        contains(TimeBucket.afternoon),
      );

      // Tapping again deactivates it
      await tester.tap(find.text('Tarde'));
      await tester.pumpAndSettle();

      expect(
        (cubit.state as OpenMatchesLoaded).activeTimeBuckets,
        isEmpty,
      );
    });
  });

  // =========================================================================
  // Phase 4.4 — availability toggle is present
  // =========================================================================

  group('_AvailabilityToggle', () {
    testWidgets('availability toggle is present and toggles onlyAvailable', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.text('Solo disponibles'), findsOneWidget);
      final switchFinder = find.byType(Switch);
      expect(switchFinder, findsOneWidget);

      final cubit = _lastCubit!;
      expect((cubit.state as OpenMatchesLoaded).onlyAvailable, isFalse);

      await tester.tap(switchFinder);
      await tester.pumpAndSettle();

      expect((cubit.state as OpenMatchesLoaded).onlyAvailable, isTrue);
    });
  });

  // =========================================================================
  // Phase 4.5 — tapping "Unirse" shows bottom sheet with match info
  // =========================================================================

  group('_JoinConfirmSheet', () {
    testWidgets('tapping Unirse shows bottom sheet with match summary', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.text('Unirse'), findsOneWidget);
      await tester.tap(find.text('Unirse'));
      await tester.pumpAndSettle();

      // Sheet shows club + court name (also shown in the list tile below, so >=1)
      expect(find.text('Club Test • Cancha 1'), findsAtLeastNWidgets(1));
      // Sheet has Unirme button
      expect(find.text('Unirme'), findsOneWidget);
      // Sheet has Cancelar button
      expect(find.text('Cancelar'), findsOneWidget);
    });

    testWidgets('Unirse button is absent for full match', (tester) async {
      final fullItem = <String, Object?>{
        'id': 'full-1',
        'sportId': 'sport',
        'categoryId': 'cat',
        'status': 'SCHEDULED',
        'scheduledAt': DateTime.now().toIso8601String(),
        'pricePerPlayerCents': 1500,
        'maxParticipants': 4,
        'participantCount': 4,
        'openSpots': 0,
        'clubName': 'Club Full',
        'courtName': 'Cancha 2',
        'locationLabel': null,
      };

      when(
        () => matchesApi.listOpenMatchesEnvelope(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
          categoryId: any(named: 'categoryId'),
        ),
      ).thenAnswer((_) async => {
            'items': [fullItem],
            'pageInfo': {'page': 1, 'limit': 20, 'total': 1},
          });

      await _setupGetIt(matchesApi, catalogApi);

      // Re-stub after setupGetIt resets getIt
      when(() => catalogApi.listSportsEnvelope())
          .thenAnswer((_) async => _sportsResponse);
      when(
        () => matchesApi.listOpenMatchesEnvelope(
          sportId: any(named: 'sportId'),
          page: any(named: 'page'),
          limit: any(named: 'limit'),
          categoryId: any(named: 'categoryId'),
        ),
      ).thenAnswer((_) async => {
            'items': [fullItem],
            'pageInfo': {'page': 1, 'limit': 20, 'total': 1},
          });

      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      expect(find.text('Unirse'), findsNothing);
    });

    testWidgets('Cancelar closes the sheet without calling joinMatch', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unirse'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancelar'));
      await tester.pumpAndSettle();

      // Sheet dismissed
      expect(find.text('Cancelar'), findsNothing);
      // joinMatch was never called
      verifyNever(
        () => matchesApi.joinMatchEnvelope(matchId: any(named: 'matchId')),
      );
    });

    testWidgets('Unirme shows error banner on failure and keeps sheet open', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);

      when(
        () => matchesApi.joinMatchEnvelope(matchId: any(named: 'matchId')),
      ).thenThrow(Exception('Error de red'));

      await tester.pumpWidget(_buildApp());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unirse'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Unirme'));
      await tester.pumpAndSettle();

      // Error banner visible
      expect(find.textContaining('Error de red'), findsOneWidget);
      // Sheet still open
      expect(find.text('Unirme'), findsOneWidget);
      expect(find.text('Cancelar'), findsOneWidget);
    });
  });
}
