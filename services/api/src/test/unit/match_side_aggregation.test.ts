import { describe, expect, it } from 'vitest';

import {
  groupMatchParticipantsBySideSV,
  resolveMatchWinningUserIdsSV,
} from '../../domain/tournament/match_side_aggregation.js';

describe('resolveMatchWinningUserIdsSV', () => {
  //? Singles: sin teamLabel, cada userId es su propio lado.
  it('should return the single winner when one side scores strictly more', () => {
    const WINNERS = resolveMatchWinningUserIdsSV([
      { userId: 'user-a', teamLabel: null, points: 4 },
      { userId: 'user-b', teamLabel: null, points: 2 },
    ]);

    expect(WINNERS).toEqual(['user-a']);
  });

  it('should return no winners on a singles tie', () => {
    const WINNERS = resolveMatchWinningUserIdsSV([
      { userId: 'user-a', teamLabel: null, points: 15 },
      { userId: 'user-b', teamLabel: null, points: 15 },
    ]);

    expect(WINNERS).toEqual([]);
  });

  //? Dupla: se suma por teamLabel, no por fila individual. A=[15,15]=30 vs
  //? B=[20,10]=30 empata pese a que B tiene la fila individual más alta (20).
  it('should return no winners when doubles sides tie by sum, even if one row is individually higher', () => {
    const WINNERS = resolveMatchWinningUserIdsSV([
      { userId: 'a1', teamLabel: 'A', points: 15 },
      { userId: 'a2', teamLabel: 'A', points: 15 },
      { userId: 'b1', teamLabel: 'B', points: 20 },
      { userId: 'b2', teamLabel: 'B', points: 10 },
    ]);

    expect(WINNERS).toEqual([]);
  });

  //? A=[10,9]=19 vs B=[15,2]=17: A gana por suma pese a que B tiene la fila
  //? individual más alta (15). Ambos jugadores del lado A ganan.
  it('should return both winning-side userIds when the side sum wins despite a lower individual max', () => {
    const WINNERS = resolveMatchWinningUserIdsSV([
      { userId: 'a1', teamLabel: 'A', points: 10 },
      { userId: 'a2', teamLabel: 'A', points: 9 },
      { userId: 'b1', teamLabel: 'B', points: 15 },
      { userId: 'b2', teamLabel: 'B', points: 2 },
    ]);

    expect(WINNERS.sort()).toEqual(['a1', 'a2']);
  });
});

describe('groupMatchParticipantsBySideSV', () => {
  //? Singles: sin teamLabel, cada userId es su propio lado (mismo caso base
  //? que aggregateMatchSideTotalsSV, pero sin puntos).
  it('should treat each participant as its own side when there is no teamLabel', () => {
    const SIDES = groupMatchParticipantsBySideSV([
      { userId: 'user-a', teamLabel: null, tournamentRegistrationId: 'reg-a' },
      { userId: 'user-b', teamLabel: null, tournamentRegistrationId: 'reg-b' },
    ]);

    expect(SIDES).toHaveLength(2);
    expect(SIDES.map((_s) => _s.userIds)).toEqual([['user-a'], ['user-b']]);
  });

  //? Dupla: dos jugadores por lado, agrupados por teamLabel.
  it('should group two players per side for a doubles match', () => {
    const SIDES = groupMatchParticipantsBySideSV([
      { userId: 'a1', teamLabel: 'A', tournamentRegistrationId: 'reg-a1' },
      { userId: 'a2', teamLabel: 'A', tournamentRegistrationId: 'reg-a2' },
      { userId: 'b1', teamLabel: 'B', tournamentRegistrationId: 'reg-b1' },
      { userId: 'b2', teamLabel: 'B', tournamentRegistrationId: 'reg-b2' },
    ]);

    expect(SIDES).toHaveLength(2);
    const A_SIDE = SIDES.find((_s) => _s.sideKey === 'A');
    expect(A_SIDE?.userIds.sort()).toEqual(['a1', 'a2']);
    const B_SIDE = SIDES.find((_s) => _s.sideKey === 'B');
    expect(B_SIDE?.userIds.sort()).toEqual(['b1', 'b2']);
  });

  //? Invitado en singles: sin teamLabel ni userId, cae a tournamentRegistrationId
  //? para no colisionar dos invitados distintos en el mismo lado.
  it('should fall back to tournamentRegistrationId for a guest with no userId', () => {
    const SIDES = groupMatchParticipantsBySideSV([
      { userId: null, teamLabel: null, tournamentRegistrationId: 'reg-guest-1' },
      { userId: null, teamLabel: null, tournamentRegistrationId: 'reg-guest-2' },
    ]);

    expect(SIDES).toHaveLength(2);
    expect(SIDES.map((_s) => _s.userIds)).toEqual([[null], [null]]);
  });
});
