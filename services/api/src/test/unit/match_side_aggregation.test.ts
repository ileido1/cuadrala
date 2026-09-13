import { describe, expect, it } from 'vitest';

import { resolveMatchWinningUserIdsSV } from '../../domain/tournament/match_side_aggregation.js';

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
