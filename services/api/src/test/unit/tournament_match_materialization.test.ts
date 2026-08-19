import { describe, expect, it } from 'vitest';

import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';

describe('buildMaterializedMatchPlansSV', () => {
  it('maps an AMERICANO payload to one 2v2 plan per court, per round', () => {
    const PAYLOAD = {
      rounds: [
        {
          roundNumber: 1,
          courts: [
            { courtNumber: 1, teamA: ['user-a', 'user-b'], teamB: ['user-c', 'user-d'] },
          ],
        },
      ],
    };

    const PLANS = buildMaterializedMatchPlansSV({ formatCode: 'AMERICANO', payload: PAYLOAD });

    expect(PLANS).toEqual([
      {
        roundNumber: 1,
        matchNumber: 1,
        participants: [
          { participantRef: 'user-a', teamLabel: 'A' },
          { participantRef: 'user-b', teamLabel: 'A' },
          { participantRef: 'user-c', teamLabel: 'B' },
          { participantRef: 'user-d', teamLabel: 'B' },
        ],
      },
    ]);
  });

  it('maps a ROUND_ROBIN payload to one 1v1 plan per match, per round', () => {
    const PAYLOAD = {
      rounds: [
        { roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'user-a', playerB: 'user-b' }] },
        { roundNumber: 2, matches: [{ matchNumber: 1, playerA: 'user-a', playerB: 'user-c' }] },
      ],
    };

    const PLANS = buildMaterializedMatchPlansSV({ formatCode: 'ROUND_ROBIN', payload: PAYLOAD });

    expect(PLANS).toEqual([
      {
        roundNumber: 1,
        matchNumber: 1,
        participants: [
          { participantRef: 'user-a', teamLabel: null },
          { participantRef: 'user-b', teamLabel: null },
        ],
      },
      {
        roundNumber: 2,
        matchNumber: 1,
        participants: [
          { participantRef: 'user-a', teamLabel: null },
          { participantRef: 'user-c', teamLabel: null },
        ],
      },
    ]);
  });

  it('skips SINGLE_ELIMINATION bye matches but keeps matches with both players defined', () => {
    const PAYLOAD = {
      rounds: [
        {
          roundNumber: 1,
          name: 'Ronda 1',
          matches: [
            { matchNumber: 1, playerA: 'user-a', playerB: 'user-b', bye: false },
            { matchNumber: 2, playerA: 'user-c', playerB: null, bye: true },
          ],
        },
        {
          roundNumber: 2,
          name: 'Final',
          matches: [{ matchNumber: 1, playerA: null, playerB: null, bye: false }],
        },
      ],
      totalRounds: 2,
      bracketSize: 4,
    };

    const PLANS = buildMaterializedMatchPlansSV({ formatCode: 'SINGLE_ELIMINATION', payload: PAYLOAD });

    expect(PLANS).toEqual([
      {
        roundNumber: 1,
        matchNumber: 1,
        participants: [
          { participantRef: 'user-a', teamLabel: null },
          { participantRef: 'user-b', teamLabel: null },
        ],
      },
    ]);
  });

  it('throws AppError 501 FORMATO_NO_SOPORTADO for an unknown formatCode', () => {
    expect(() =>
      buildMaterializedMatchPlansSV({ formatCode: 'SWISS', payload: { rounds: [] } }),
    ).toThrow('Formato no soportado');
  });
});
