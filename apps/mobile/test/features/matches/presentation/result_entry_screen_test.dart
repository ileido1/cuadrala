import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/core/di/service_locator.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/set_score.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/result_entry_screen.dart';

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

final _now = DateTime.utc(2026, 5, 25, 12);

final _matchJson = <String, Object?>{
  'id': 'match-1',
  'sportId': 'sport-padel',
  'categoryId': 'cat-1',
  'type': 'REGULAR',
  'status': 'FINISHED',
  'scheduledAt': _now.toIso8601String(),
  'pricePerPlayerCents': 0,
  'maxParticipants': 4,
  'participantCount': 4,
  'openSpots': 0,
  'courtId': null,
  'clubName': 'Club Test',
  'courtName': 'Cancha 1',
  'locationLabel': 'Dirección',
  'tournamentId': null,
  'participants': [
    {
      'userId': 'u1',
      'displayName': 'Ana Pérez',
      'joinedAt': _now.toIso8601String(),
    },
    {
      'userId': 'u2',
      'displayName': 'Bruno López',
      'joinedAt': _now.toIso8601String(),
    },
    {
      'userId': 'u3',
      'displayName': 'Carlos Díaz',
      'joinedAt': _now.toIso8601String(),
    },
    {
      'userId': 'u4',
      'displayName': 'Diana Ruiz',
      'joinedAt': _now.toIso8601String(),
    },
  ],
  'createdAt': _now.toIso8601String(),
  'updatedAt': _now.toIso8601String(),
};

final _padelSportsJson = <String, Object?>{
  'sports': [
    {'id': 'sport-padel', 'code': 'PADEL', 'name': 'Pádel'},
  ],
};

// ---------------------------------------------------------------------------
// getIt setup — captures the cubit instance created by the factory
// ---------------------------------------------------------------------------

ResultEntryCubit? _lastCubit;

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

  getIt.registerFactoryParam<ResultEntryCubit, String, void>(
    (matchId, _) {
      final cubit = ResultEntryCubit(
        matchesRepository: matchesRepo,
        catalogRepository: catalogRepo,
        matchId: matchId,
      );
      _lastCubit = cubit;
      return cubit;
    },
  );
}

Widget _buildTestApp() => const MaterialApp(
      home: ResultEntryScreen(matchId: 'match-1'),
    );

// ---------------------------------------------------------------------------
// Helper: pump to loaded state then advance cubit to step 2 (score entry)
// ---------------------------------------------------------------------------

Future<void> _pumpToScoreStep(WidgetTester tester) async {
  await tester.pumpAndSettle();

  final cubit = _lastCubit!;

  // Assign players: u1, u2 → A; u3, u4 → B
  cubit.cyclePlayerTeam('u1'); // → A
  cubit.cyclePlayerTeam('u2'); // → A
  cubit.cyclePlayerTeam('u3'); // → B (A is full)
  cubit.cyclePlayerTeam('u4'); // → B (A is full)
  await tester.pump();

  // Assign sides
  cubit.setSide('u1', 'DRIVE');
  cubit.setSide('u2', 'REVES');
  cubit.setSide('u3', 'DRIVE');
  cubit.setSide('u4', 'REVES');
  await tester.pump();

  // Advance to step 1 (sides)
  cubit.nextStep();
  await tester.pumpAndSettle();

  // Advance to step 2 (score)
  cubit.nextStep();
  await tester.pumpAndSettle();
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

    when(() => matchesApi.getMatchEnvelope(matchId: any(named: 'matchId')))
        .thenAnswer((_) async => _matchJson);
    when(() => catalogApi.listSportsEnvelope())
        .thenAnswer((_) async => _padelSportsJson);
  });

  tearDown(() async {
    await getIt.reset();
    _lastCubit = null;
  });

  // --------------------------------------------------------------------------
  // T-08: Team assignment step
  // --------------------------------------------------------------------------

  group('T-08 — Team assignment step', () {
    testWidgets('shows loading spinner then populates all 4 players',
        (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      expect(find.text('Ana Pérez'), findsOneWidget);
      expect(find.text('Bruno López'), findsOneWidget);
      expect(find.text('Carlos Díaz'), findsOneWidget);
      expect(find.text('Diana Ruiz'), findsOneWidget);
    });

    testWidgets('tapping a player chip cycles assignment (unassigned → Team A)',
        (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      expect(find.text('Sin equipo'), findsNWidgets(4));

      await tester.tap(find.byKey(const Key('player.chip.u1')));
      await tester.pumpAndSettle();

      expect(find.text('Equipo A'), findsOneWidget);
      expect(find.text('Sin equipo'), findsNWidgets(3));
    });

    testWidgets('cyclePlayerTeam a second time moves player from A to B',
        (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      // First tap: u1 → A
      await tester.tap(find.byKey(const Key('player.chip.u1')));
      await tester.pumpAndSettle();
      expect(find.text('Equipo A'), findsOneWidget);

      // Second tap: u1 → B (since A has only 1 spot still open but we want to
      // test the B badge; tap again to cycle A→B)
      await tester.tap(find.byKey(const Key('player.chip.u1')));
      await tester.pumpAndSettle();

      // u1 should now be in Team B
      expect(find.text('Equipo B'), findsOneWidget);
    });

    testWidgets('Continuar is disabled until all 4 players are assigned',
        (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await tester.pumpAndSettle();

      FilledButton findContinuar() => tester.widget<FilledButton>(
            find.ancestor(
              of: find.text('Continuar'),
              matching: find.byType(FilledButton),
            ),
          );

      expect(findContinuar().onPressed, isNull);

      // Assign u1 → A, u2 → A, u3 → B, u4 → B
      await tester.tap(find.byKey(const Key('player.chip.u1')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('player.chip.u2')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('player.chip.u3')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('player.chip.u4')));
      await tester.pumpAndSettle();

      expect(findContinuar().onPressed, isNotNull);
    });
  });

  // --------------------------------------------------------------------------
  // T-10: Score entry step
  // --------------------------------------------------------------------------

  group('T-10 — Score entry step', () {
    testWidgets('entering 7-5 shows inline validation error', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await _pumpToScoreStep(tester);

      // Tap + on team A until 7
      final incrementA = find.descendant(
        of: find.byKey(const Key('draft.score.a')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 7; i++) {
        await tester.tap(incrementA);
        await tester.pump();
      }

      // Tap + on team B until 5
      final incrementB = find.descendant(
        of: find.byKey(const Key('draft.score.b')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 5; i++) {
        await tester.tap(incrementB);
        await tester.pump();
      }
      await tester.pump();

      expect(find.byKey(const Key('draft.error')), findsOneWidget);
      expect(
        find.text('Marcador inválido para pádel. Ej: 6-4, 7-6.'),
        findsOneWidget,
      );

      final addSetButton = tester.widget<OutlinedButton>(
        find.ancestor(
          of: find.text('Agregar set'),
          matching: find.byType(OutlinedButton),
        ),
      );
      expect(addSetButton.onPressed, isNull);
    });

    testWidgets('entering 6-4 enables Agregar set button', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await _pumpToScoreStep(tester);

      final incrementA = find.descendant(
        of: find.byKey(const Key('draft.score.a')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 6; i++) {
        await tester.tap(incrementA);
        await tester.pump();
      }

      final incrementB = find.descendant(
        of: find.byKey(const Key('draft.score.b')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 4; i++) {
        await tester.tap(incrementB);
        await tester.pump();
      }
      await tester.pump();

      expect(find.byKey(const Key('draft.error')), findsNothing);

      final addSetButton = tester.widget<OutlinedButton>(
        find.ancestor(
          of: find.text('Agregar set'),
          matching: find.byType(OutlinedButton),
        ),
      );
      expect(addSetButton.onPressed, isNotNull);
    });

    testWidgets('draft resets to 0-0 after adding a valid set', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await _pumpToScoreStep(tester);

      final incrementA = find.descendant(
        of: find.byKey(const Key('draft.score.a')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 6; i++) {
        await tester.tap(incrementA);
        await tester.pump();
      }
      final incrementB = find.descendant(
        of: find.byKey(const Key('draft.score.b')),
        matching: find.byIcon(Icons.add_circle_outline),
      );
      for (int i = 0; i < 3; i++) {
        await tester.tap(incrementB);
        await tester.pump();
      }
      await tester.pump();

      await tester.tap(find.byKey(const Key('add.set.button')));
      await tester.pump();

      expect(
        find.descendant(
          of: find.byKey(const Key('draft.score.a')),
          matching: find.text('0'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('draft.score.b')),
          matching: find.text('0'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('shows completed set row with delete button', (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await _pumpToScoreStep(tester);

      // Add a valid set via cubit directly
      _lastCubit!.addSet(const SetScore(teamA: 6, teamB: 4));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('set.row.0')), findsOneWidget);
      expect(find.text('6  –  4'), findsOneWidget);
      expect(find.byKey(const Key('remove.last.set')), findsOneWidget);
    });

    testWidgets('tapping remove last set removes it from cubit state',
        (tester) async {
      await _setupGetIt(matchesApi, catalogApi);
      await tester.pumpWidget(_buildTestApp());
      await _pumpToScoreStep(tester);

      _lastCubit!.addSet(const SetScore(teamA: 6, teamB: 4));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('remove.last.set')));
      await tester.pump();

      expect(_lastCubit?.state.sets, isEmpty);
    });
  });
}
