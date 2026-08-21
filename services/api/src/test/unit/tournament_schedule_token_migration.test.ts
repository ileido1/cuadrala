import { describe, expect, it } from 'vitest';

import { remapScheduleTokensSV } from '../../domain/tournament/tournament_schedule_token_migration.js';

describe('remapScheduleTokensSV', () => {
  it('replaces userId tokens with the mapped registrationId (ROUND_ROBIN payload)', () => {
    const PAYLOAD = {
      rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'user-a', playerB: 'user-b' }] }],
    };
    const TOKEN_MAP = new Map([
      ['user-a', 'reg-a'],
      ['user-b', 'reg-b'],
    ]);

    const RESULT = remapScheduleTokensSV(PAYLOAD, TOKEN_MAP);

    expect(RESULT).toEqual({
      rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-a', playerB: 'reg-b' }] }],
    });
  });

  it('replaces userId tokens nested inside arrays (AMERICANO teamA/teamB)', () => {
    const PAYLOAD = {
      rounds: [
        {
          roundNumber: 1,
          courts: [{ courtNumber: 1, teamA: ['user-a', 'user-b'], teamB: ['user-c', 'user-d'] }],
        },
      ],
    };
    const TOKEN_MAP = new Map([
      ['user-a', 'reg-a'],
      ['user-b', 'reg-b'],
      ['user-c', 'reg-c'],
      ['user-d', 'reg-d'],
    ]);

    const RESULT = remapScheduleTokensSV(PAYLOAD, TOKEN_MAP);

    expect(RESULT).toEqual({
      rounds: [
        {
          roundNumber: 1,
          courts: [{ courtNumber: 1, teamA: ['reg-a', 'reg-b'], teamB: ['reg-c', 'reg-d'] }],
        },
      ],
    });
  });

  it('leaves numbers, booleans, and null untouched', () => {
    const PAYLOAD = { roundNumber: 1, bye: true, playerB: null };

    const RESULT = remapScheduleTokensSV(PAYLOAD, new Map([['user-a', 'reg-a']]));

    expect(RESULT).toEqual({ roundNumber: 1, bye: true, playerB: null });
  });

  it('leaves an already-migrated payload unchanged (idempotent — registrationId tokens do not match any userId)', () => {
    const PAYLOAD = {
      rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-a', playerB: 'reg-b' }] }],
    };
    const TOKEN_MAP = new Map([
      ['user-a', 'reg-a'],
      ['user-b', 'reg-b'],
    ]);

    const RESULT = remapScheduleTokensSV(PAYLOAD, TOKEN_MAP);

    expect(RESULT).toEqual(PAYLOAD);
  });

  it('leaves an unresolvable token unchanged when it has no entry in the token map', () => {
    const PAYLOAD = { rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'user-x', playerB: 'user-y' }] }] };

    const RESULT = remapScheduleTokensSV(PAYLOAD, new Map([['user-a', 'reg-a']]));

    expect(RESULT).toEqual(PAYLOAD);
  });
});
