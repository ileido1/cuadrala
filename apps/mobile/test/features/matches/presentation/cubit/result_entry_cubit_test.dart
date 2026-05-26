import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:cuadrala_mobile/src/features/catalog/data/catalog_api.dart';
import 'package:cuadrala_mobile/src/features/catalog/data/catalog_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_api.dart';
import 'package:cuadrala_mobile/src/features/matches/data/matches_repository.dart';
import 'package:cuadrala_mobile/src/features/matches/data/models/match_detail_dto.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/padel_scoring_config.dart';
import 'package:cuadrala_mobile/src/features/matches/domain/scoring/set_score.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_cubit.dart';
import 'package:cuadrala_mobile/src/features/matches/presentation/cubit/result_entry_state.dart';

class _MockMatchesApi extends Mock implements MatchesApi {}

class _MockCatalogApi extends Mock implements CatalogApi {}

void main() {
  const matchId = 'match-1';
  const sportId = 'sport-padel';

  late _MockMatchesApi matchesApi;
  late _MockCatalogApi catalogApi;
  late MatchesRepository matchesRepository;
  late CatalogRepository catalogRepository;

  final now = DateTime.utc(2026, 5, 25, 12);

  MatchDetailDto buildMatch({
    List<MatchParticipantDto>? participants,
  }) {
    return MatchDetailDto(
      id: matchId,
      sportId: sportId,
      categoryId: 'cat-1',
      type: 'REGULAR',
      status: 'FINISHED',
      scheduledAt: now,
      pricePerPlayerCents: 0,
      maxParticipants: 4,
      participantCount: 4,
      openSpots: 0,
      courtId: null,
      clubName: 'Club Test',
      courtName: 'Cancha 1',
      locationLabel: 'Dirección',
      tournamentId: null,
      participants: participants ??
          [
            MatchParticipantDto(userId: 'u1', joinedAt: now),
            MatchParticipantDto(userId: 'u2', joinedAt: now),
            MatchParticipantDto(userId: 'u3', joinedAt: now),
            MatchParticipantDto(userId: 'u4', joinedAt: now),
          ],
      createdAt: now,
      updatedAt: now,
    );
  }

  Map<String, Object?> buildMatchJson(MatchDetailDto match) {
    return {
      'id': match.id,
      'sportId': match.sportId,
      'categoryId': match.categoryId,
      'type': match.type,
      'status': match.status,
      'scheduledAt': match.scheduledAt?.toIso8601String(),
      'pricePerPlayerCents': match.pricePerPlayerCents,
      'maxParticipants': match.maxParticipants,
      'participantCount': match.participantCount,
      'openSpots': match.openSpots,
      'courtId': match.courtId,
      'clubName': match.clubName,
      'courtName': match.courtName,
      'locationLabel': match.locationLabel,
      'tournamentId': match.tournamentId,
      'participants': match.participants
          .map((p) => {
                'userId': p.userId,
                'joinedAt': p.joinedAt.toIso8601String(),
              })
          .toList(),
      'createdAt': match.createdAt.toIso8601String(),
      'updatedAt': match.updatedAt.toIso8601String(),
    };
  }

  final padelSportsResponse = {
    'sports': [
      {'id': sportId, 'code': 'PADEL', 'name': 'Pádel'},
    ],
  };

  ResultEntryCubit buildCubit() => ResultEntryCubit(
        matchesRepository: matchesRepository,
        catalogRepository: catalogRepository,
        matchId: matchId,
      );

  setUp(() {
    matchesApi = _MockMatchesApi();
    catalogApi = _MockCatalogApi();
    matchesRepository = MatchesRepository(
      matchesApi: matchesApi,
      catalogRepository: CatalogRepository(catalogApi: catalogApi),
    );
    catalogRepository = CatalogRepository(catalogApi: catalogApi);
  });

  group('ResultEntryCubit', () {
    group('load()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'emite estado cargado con match y scoringConfig',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) => cubit.load(),
        expect: () => [
          isA<ResultEntryState>()
              .having((s) => s.loading, 'loading', isFalse)
              .having((s) => s.match, 'match', isNotNull)
              .having(
                  (s) => s.scoringConfig, 'scoringConfig', isA<PadelScoringConfig>()),
        ],
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'establece error cuando falla getMatchById',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenThrow(Exception('Network error'));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) => cubit.load(),
        expect: () => [
          isA<ResultEntryState>()
              .having((s) => s.loading, 'loading', isFalse)
              .having((s) => s.error, 'error', isNotNull),
        ],
      );
    });

    group('cyclePlayerTeam()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'primer ciclo: no asignado → teamA',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
        },
        expect: () => [
          isA<ResultEntryState>().having((s) => s.loading, 'loading', isFalse),
          isA<ResultEntryState>()
              .having((s) => s.teamA, 'teamA', contains('u1')),
        ],
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'segundo ciclo: teamA → teamB',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u1');
        },
        expect: () => [
          isA<ResultEntryState>().having((s) => s.loading, 'loading', isFalse),
          isA<ResultEntryState>()
              .having((s) => s.teamA, 'teamA', contains('u1'))
              .having((s) => s.teamB, 'teamB', isNot(contains('u1'))),
          isA<ResultEntryState>()
              .having((s) => s.teamB, 'teamB', contains('u1'))
              .having((s) => s.teamA, 'teamA', isNot(contains('u1'))),
        ],
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'tercer ciclo: teamB → no asignado',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u1');
        },
        expect: () => [
          isA<ResultEntryState>().having((s) => s.loading, 'loading', isFalse),
          isA<ResultEntryState>()
              .having((s) => s.teamA, 'teamA', contains('u1')),
          isA<ResultEntryState>()
              .having((s) => s.teamB, 'teamB', contains('u1')),
          isA<ResultEntryState>()
              .having((s) => s.teamA, 'teamA', isNot(contains('u1')))
              .having((s) => s.teamB, 'teamB', isNot(contains('u1'))),
        ],
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'no agrega tercer jugador a teamA',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u2');
          cubit.cyclePlayerTeam('u3');
        },
        verify: (cubit) {
          expect(cubit.state.teamA.length, lessThanOrEqualTo(2));
        },
      );
    });

    group('setSide()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'actualiza sideByUserId correctamente',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.setSide('u1', 'DRIVE');
          cubit.setSide('u2', 'REVES');
        },
        verify: (cubit) {
          expect(cubit.state.sideByUserId['u1'], equals('DRIVE'));
          expect(cubit.state.sideByUserId['u2'], equals('REVES'));
        },
      );
    });

    group('addSet()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'agrega set válido',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.addSet(const SetScore(teamA: 6, teamB: 4));
        },
        verify: (cubit) {
          expect(cubit.state.sets.length, equals(1));
          expect(
              cubit.state.sets.first, equals(const SetScore(teamA: 6, teamB: 4)));
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'rechaza set inválido (7-5)',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.addSet(const SetScore(teamA: 7, teamB: 5));
        },
        verify: (cubit) {
          expect(cubit.state.sets, isEmpty);
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'no agrega set cuando el partido ya terminó',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.addSet(const SetScore(teamA: 6, teamB: 4));
          cubit.addSet(const SetScore(teamA: 6, teamB: 3));
          cubit.addSet(const SetScore(teamA: 6, teamB: 2));
        },
        verify: (cubit) {
          expect(cubit.state.sets.length, equals(2));
        },
      );
    });

    group('removeLastSet()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'elimina el último set',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.addSet(const SetScore(teamA: 6, teamB: 4));
          cubit.addSet(const SetScore(teamA: 6, teamB: 3));
          cubit.removeLastSet();
        },
        verify: (cubit) {
          expect(cubit.state.sets.length, equals(1));
          expect(cubit.state.sets.last, equals(const SetScore(teamA: 6, teamB: 4)));
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'no-op cuando sets está vacío',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.removeLastSet();
        },
        verify: (cubit) {
          expect(cubit.state.sets, isEmpty);
        },
      );
    });

    group('nextStep() / prevStep()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'avanza de paso 0 a 1 cuando isTeamAssignmentComplete',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u2');
          cubit.cyclePlayerTeam('u3');
          cubit.cyclePlayerTeam('u4');
          cubit.nextStep();
        },
        verify: (cubit) {
          expect(cubit.state.step, equals(1));
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'bloquea avance cuando isTeamAssignmentComplete es false',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.nextStep();
        },
        verify: (cubit) {
          expect(cubit.state.step, equals(0));
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'prevStep no baja de 0',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.prevStep();
        },
        verify: (cubit) {
          expect(cubit.state.step, equals(0));
        },
      );
    });

    group('submit()', () {
      blocTest<ResultEntryCubit, ResultEntryState>(
        'llama a upsertResultDraft con payload correcto y emite submitted',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
          when(
            () => matchesApi.upsertResultDraftEnvelope(
              matchId: any(named: 'matchId'),
              body: any(named: 'body'),
            ),
          ).thenAnswer((_) async => {});
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u2');
          cubit.cyclePlayerTeam('u3');
          cubit.cyclePlayerTeam('u4');
          cubit.setSide('u1', 'DRIVE');
          cubit.setSide('u2', 'REVES');
          cubit.setSide('u3', 'DRIVE');
          cubit.setSide('u4', 'REVES');
          cubit.addSet(const SetScore(teamA: 6, teamB: 4));
          cubit.addSet(const SetScore(teamA: 6, teamB: 3));
          await cubit.submit();
        },
        verify: (cubit) {
          expect(cubit.state.submitted, isTrue);
          expect(cubit.state.submitting, isFalse);

          final captured = verify(
            () => matchesApi.upsertResultDraftEnvelope(
              matchId: captureAny(named: 'matchId'),
              body: captureAny(named: 'body'),
            ),
          ).captured;
          expect(captured[0], equals(matchId));

          final body = captured[1] as Map<String, Object?>;
          final scores = body['scores'] as List<Map<String, Object?>>;
          expect(scores.length, equals(4));

          final u1Score = scores.firstWhere((s) => s['userId'] == 'u1');
          final u3Score = scores.firstWhere((s) => s['userId'] == 'u3');
          expect(u1Score['points'], equals(12));
          expect(u3Score['points'], equals(7));

          final teams = body['teams'] as List<Map<String, Object?>>;
          expect(teams.length, equals(2));
          final teamA = teams.firstWhere((t) => t['label'] == 'A');
          final teamB = teams.firstWhere((t) => t['label'] == 'B');
          expect(teamA['userIds'], containsAll(['u1', 'u2']));
          expect(teamB['userIds'], containsAll(['u3', 'u4']));

          final sets = body['sets'] as List<Map<String, Object?>>;
          expect(sets.length, equals(2));
          expect(sets[0], equals({'teamA': 6, 'teamB': 4}));
          expect(sets[1], equals({'teamA': 6, 'teamB': 3}));

          final sideByUserId = body['sideByUserId'] as Map<String, String>;
          expect(sideByUserId['u1'], equals('DRIVE'));
          expect(sideByUserId['u2'], equals('REVES'));
          expect(sideByUserId['u3'], equals('DRIVE'));
          expect(sideByUserId['u4'], equals('REVES'));
        },
      );

      blocTest<ResultEntryCubit, ResultEntryState>(
        'establece error cuando upsertResultDraft falla y permite retry',
        setUp: () {
          when(() => matchesApi.getMatchEnvelope(matchId: matchId))
              .thenAnswer((_) async => buildMatchJson(buildMatch()));
          when(() => catalogApi.listSportsEnvelope())
              .thenAnswer((_) async => padelSportsResponse);
          when(
            () => matchesApi.upsertResultDraftEnvelope(
              matchId: any(named: 'matchId'),
              body: any(named: 'body'),
            ),
          ).thenThrow(Exception('Server error'));
        },
        build: buildCubit,
        act: (cubit) async {
          await cubit.load();
          cubit.cyclePlayerTeam('u1');
          cubit.cyclePlayerTeam('u2');
          cubit.cyclePlayerTeam('u3');
          cubit.cyclePlayerTeam('u4');
          cubit.setSide('u1', 'DRIVE');
          cubit.setSide('u2', 'REVES');
          cubit.setSide('u3', 'DRIVE');
          cubit.setSide('u4', 'REVES');
          cubit.addSet(const SetScore(teamA: 6, teamB: 4));
          cubit.addSet(const SetScore(teamA: 6, teamB: 3));
          await cubit.submit();
        },
        verify: (cubit) {
          expect(cubit.state.error, isNotNull);
          expect(cubit.state.submitting, isFalse);
          expect(cubit.state.submitted, isFalse);
        },
      );
    });
  });
}
