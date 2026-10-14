import 'package:flutter_test/flutter_test.dart';

import 'package:cuadrala_mobile/src/features/tournaments/data/models/tournament_schedule_dto.dart';

void main() {
  //? S6b enriches `GET /tournaments/:id/schedule` matches with real match
  //? state (D2): matchId, matchStatus, decision, rejectedByName, sides,
  //? scores — resolved server-side via `formatParameters.{scheduleKey,
  //? roundNumber,matchNumber}`. M11a teaches the mobile DTO to parse them.
  Map<String, Object?> matchJsonSV({Map<String, Object?> extra = const {}}) => {
    'id': '1-1',
    'label': 'Ana · Marcos vs Lucia · Diego',
    'status': 'SCHEDULED',
    'matchId': 'match-1',
    'scheduledAt': '2024-01-01T12:00:00.000Z',
    'courtId': 'court-1',
    'courtName': 'Cancha 1',
    'matchStatus': 'FINISHED',
    'decision': 'ACCEPTED',
    'rejectedByName': null,
    'sides': [
      {
        'sideKey': 'user-1',
        'userIds': ['user-1'],
      },
      {
        'sideKey': 'user-2',
        'userIds': ['user-2'],
      },
    ],
    'scores': [
      {'userId': 'user-1', 'points': 6},
      {'userId': 'user-2', 'points': 3},
    ],
    ...extra,
  };

  group('TournamentScheduleMatchDto', () {
    test(
      'should parse matchStatus, decision, rejectedByName, sides and scores',
      () {
        final match = TournamentScheduleMatchDto.fromJson(matchJsonSV());

        expect(match.matchStatus, 'FINISHED');
        expect(match.decision, 'ACCEPTED');
        expect(match.rejectedByName, isNull);
        expect(match.sides, hasLength(2));
        expect(match.sides.first.sideKey, 'user-1');
        expect(match.sides.first.userIds, ['user-1']);
        expect(match.scores, hasLength(2));
        expect(match.scores.first.userId, 'user-1');
        expect(match.scores.first.points, 6);
      },
    );

    test('should keep parsing matchId (pre-existing field)', () {
      final match = TournamentScheduleMatchDto.fromJson(matchJsonSV());

      expect(match.matchId, 'match-1');
    });

    test('should read rejectedByName when decision is REJECTED', () {
      final match = TournamentScheduleMatchDto.fromJson(
        matchJsonSV(
          extra: {'decision': 'REJECTED', 'rejectedByName': 'Ana López'},
        ),
      );

      expect(match.decision, 'REJECTED');
      expect(match.rejectedByName, 'Ana López');
    });

    test(
      'should default matchStatus to null, decision to PENDING and sides/scores to empty '
      'when the match is not materialized',
      () {
        final match = TournamentScheduleMatchDto.fromJson({
          'id': '1-1',
          'label': 'Ana vs Lucia',
          'status': 'SCHEDULED',
        });

        expect(match.matchStatus, isNull);
        expect(match.decision, 'PENDING');
        expect(match.rejectedByName, isNull);
        expect(match.sides, isEmpty);
        expect(match.scores, isEmpty);
      },
    );

    test('should round-trip through toJson', () {
      final match = TournamentScheduleMatchDto.fromJson(matchJsonSV());

      final json = match.toJson();

      expect(json['matchStatus'], 'FINISHED');
      expect(json['decision'], 'ACCEPTED');
      expect(json['sides'], hasLength(2));
      expect(json['scores'], hasLength(2));
    });
  });

  test('should not fabricate a score when sides have no score identity', () {
    final match = TournamentScheduleMatchDto.fromJson({
      'id': '1-1',
      'label': 'Invitada A vs Invitado B',
      'status': 'SCHEDULED',
      'sides': [
        {
          'sideKey': 'a',
          'userIds': [null],
        },
        {
          'sideKey': 'b',
          'userIds': [null],
        },
      ],
      'scores': [
        {'userId': null, 'points': 0},
        {'userId': null, 'points': 0},
      ],
    });

    expect(match.scoreLabel, isNull);
  });

  test('should preserve a real zero-zero score when identities match', () {
    final match = TournamentScheduleMatchDto.fromJson({
      'id': '1-1',
      'label': 'Invitada A vs Invitado B',
      'status': 'SCHEDULED',
      'sides': [
        {
          'sideKey': 'a',
          'userIds': [null],
          'registrationIds': ['reg-a'],
        },
        {
          'sideKey': 'b',
          'userIds': [null],
          'registrationIds': ['reg-b'],
        },
      ],
      'scores': [
        {'userId': null, 'tournamentRegistrationId': 'reg-a', 'points': 0},
        {'userId': null, 'tournamentRegistrationId': 'reg-b', 'points': 0},
      ],
    });

    expect(match.scoreLabel, '0-0');
  });

  test('should total guest-side scores by registration identity only', () {
    const match = TournamentScheduleMatchDto(
      id: '1-1',
      label: 'Guest A vs Guest B',
      status: 'SCHEDULED',
      sides: [
        TournamentScheduleMatchSideDto(
          sideKey: 'a',
          userIds: [null],
          registrationIds: ['reg-a'],
        ),
        TournamentScheduleMatchSideDto(
          sideKey: 'b',
          userIds: [null],
          registrationIds: ['reg-b'],
        ),
      ],
      scores: [
        TournamentScheduleMatchScoreDto(
          tournamentRegistrationId: 'reg-a',
          points: 6,
        ),
        TournamentScheduleMatchScoreDto(
          tournamentRegistrationId: 'reg-b',
          points: 3,
        ),
      ],
    );

    expect(match.pointsForSide(match.sides[0]), 6);
    expect(match.pointsForSide(match.sides[1]), 3);
  });

  group('TournamentScheduleMatchSideDto', () {
    test(
      'should parse sideKey and userIds, allowing null userIds (guest side)',
      () {
        final side = TournamentScheduleMatchSideDto.fromJson({
          'sideKey': 'team-a',
          'userIds': ['user-1', null],
        });

        expect(side.sideKey, 'team-a');
        expect(side.userIds, ['user-1', null]);
      },
    );
  });

  group('TournamentScheduleMatchScoreDto', () {
    test('should parse userId and points', () {
      final score = TournamentScheduleMatchScoreDto.fromJson({
        'userId': 'user-1',
        'points': 6,
      });

      expect(score.userId, 'user-1');
      expect(score.points, 6);
    });

    test('should serialize a guest result by registration id only', () {
      const score = TournamentScheduleMatchScoreDto(
        tournamentRegistrationId: 'reg-guest',
        points: 6,
      );

      expect(score.toJson(), {
        'tournamentRegistrationId': 'reg-guest',
        'points': 6,
      });
    });
  });
}
