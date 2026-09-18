import { describe, expect, it } from 'vitest';

import {
  createGroupsPlusKnockoutScheduleKeySV,
  generateGroupsPlusKnockoutScheduleSV,
} from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';
import { resolveGroupsPlusKnockoutTransitionSV } from '../../domain/groups_plus_knockout/groups_plus_knockout_transition_resolver.js';
import type { TournamentMatchStateSV } from '../../domain/ports/tournament_match_result_repository.js';

describe('GROUPS_PLUS_KNOCKOUT schedule generator', () => {
  it('assigns sorted registrations deterministically and balances the two groups', () => {
    const INPUT = {
      participantRegistrationIds: [
        'reg-h',
        'reg-b',
        'reg-f',
        'reg-a',
        'reg-g',
        'reg-c',
        'reg-e',
        'reg-d',
      ],
    };

    const FIRST = generateGroupsPlusKnockoutScheduleSV(INPUT);
    const SECOND = generateGroupsPlusKnockoutScheduleSV(INPUT);

    expect(FIRST).toEqual(SECOND);
    expect(FIRST.groups).toEqual([
      {
        groupNumber: 1,
        participantRegistrationIds: ['reg-a', 'reg-c', 'reg-e', 'reg-g'],
      },
      {
        groupNumber: 2,
        participantRegistrationIds: ['reg-b', 'reg-d', 'reg-f', 'reg-h'],
      },
    ]);
    expect(createGroupsPlusKnockoutScheduleKeySV(INPUT)).toBe(
      'groups_plus_knockout:v1:reg-a,reg-b,reg-c,reg-d,reg-e,reg-f,reg-g,reg-h:2x2',
    );
  });

  it('generates one single round-robin phase per group and unresolved knockout slots', () => {
    const SCHEDULE = generateGroupsPlusKnockoutScheduleSV({
      participantRegistrationIds: [
        'reg-a',
        'reg-b',
        'reg-c',
        'reg-d',
        'reg-e',
        'reg-f',
        'reg-g',
        'reg-h',
      ],
    });

    const GROUP_ROUNDS = SCHEDULE.rounds.filter((_round) => _round.stage === 'GROUP');
    const KNOCKOUT_ROUNDS = SCHEDULE.rounds.filter((_round) => _round.stage === 'KNOCKOUT');

    expect(GROUP_ROUNDS).toHaveLength(6);
    expect(GROUP_ROUNDS.flatMap((_round) => _round.matches)).toHaveLength(12);
    expect(KNOCKOUT_ROUNDS).toHaveLength(2);
    expect(KNOCKOUT_ROUNDS[0]!.matches).toMatchObject([
      {
        playerA: null,
        playerB: null,
        playerASource: { groupNumber: 1, position: 1 },
        playerBSource: { groupNumber: 2, position: 2 },
      },
      {
        playerA: null,
        playerB: null,
        playerASource: { groupNumber: 2, position: 1 },
        playerBSource: { groupNumber: 1, position: 2 },
      },
    ]);
    expect(KNOCKOUT_ROUNDS[1]!.matches[0]).toMatchObject({
      playerA: null,
      playerB: null,
    });
  });

  it('resolves semifinal slots from finished group scores using points, wins, then registration id', () => {
    const PAYLOAD = generateGroupsPlusKnockoutScheduleSV({
      participantRegistrationIds: ['reg-a', 'reg-b', 'reg-c', 'reg-d'],
    });
    const GROUP_ROUNDS = PAYLOAD.rounds.filter((_round) => _round.stage === 'GROUP');
    const STATES: TournamentMatchStateSV[] = GROUP_ROUNDS.map((_round) => {
      const MATCH = _round.matches[0]!;
      const WINNER = MATCH.playerA;
      const LOSER = MATCH.playerB;
      return {
        roundNumber: _round.roundNumber,
        matchNumber: MATCH.matchNumber,
        matchId: `match-${_round.roundNumber}`,
        matchStatus: 'FINISHED',
        sides: [
          { sideKey: MATCH.playerA!, userIds: [null], registrationIds: [MATCH.playerA!] },
          { sideKey: MATCH.playerB!, userIds: [null], registrationIds: [MATCH.playerB!] },
        ],
        scores: [
          { userId: null, tournamentRegistrationId: WINNER, points: 10 },
          { userId: null, tournamentRegistrationId: LOSER, points: 5 },
        ],
      };
    });

    const RESULT = resolveGroupsPlusKnockoutTransitionSV({ payload: PAYLOAD, matchStates: STATES });

    expect(RESULT.canAdvance).toBe(true);
    expect(RESULT.payload.rounds.find((_round) => _round.roundNumber === PAYLOAD.knockout.semifinalRoundNumber)?.matches).toMatchObject([
      { playerA: 'reg-a', playerB: 'reg-d' },
      { playerA: 'reg-b', playerB: 'reg-c' },
    ]);
  });

  it('does not advance until every group match is finished with scores', () => {
    const PAYLOAD = generateGroupsPlusKnockoutScheduleSV({
      participantRegistrationIds: ['reg-a', 'reg-b', 'reg-c', 'reg-d'],
    });
    const RESULT = resolveGroupsPlusKnockoutTransitionSV({ payload: PAYLOAD, matchStates: [] });

    expect(RESULT.canAdvance).toBe(false);
    expect(RESULT.payload).toEqual(PAYLOAD);
  });

  it('uses registration id as the deterministic v1 tie-breaker', () => {
    const PAYLOAD = generateGroupsPlusKnockoutScheduleSV({
      participantRegistrationIds: ['reg-a', 'reg-b', 'reg-c', 'reg-d', 'reg-e', 'reg-f', 'reg-g', 'reg-h'],
    });
    const STATES: TournamentMatchStateSV[] = PAYLOAD.rounds
      .filter((_round) => _round.stage === 'GROUP')
      .flatMap((_round) =>
        _round.matches.map((_match) => ({
          roundNumber: _round.roundNumber,
          matchNumber: _match.matchNumber,
          matchId: `${_round.roundNumber}-${_match.matchNumber}`,
          matchStatus: 'FINISHED',
          sides: [
            { sideKey: _match.playerA!, userIds: [null], registrationIds: [_match.playerA!] },
            { sideKey: _match.playerB!, userIds: [null], registrationIds: [_match.playerB!] },
          ],
          scores: [
            { userId: null, tournamentRegistrationId: _match.playerA, points: 0 },
            { userId: null, tournamentRegistrationId: _match.playerB, points: 0 },
          ],
        })),
      );

    const RESULT = resolveGroupsPlusKnockoutTransitionSV({ payload: PAYLOAD, matchStates: STATES });
    const SEMIFINALS = RESULT.payload.rounds.find(
      (_round) => _round.roundNumber === PAYLOAD.knockout.semifinalRoundNumber,
    )!.matches;

    expect(RESULT.canAdvance).toBe(true);
    expect(SEMIFINALS).toMatchObject([
      { playerA: 'reg-a', playerB: 'reg-d' },
      { playerA: 'reg-b', playerB: 'reg-c' },
    ]);
  });
});
