import { describe, expect, it } from 'vitest';

import {
  applyEloForFreeForAllPerPlayerKSV,
  performanceScoreFromPointsSV,
} from '../../domain/elo/elo_rating.js';

describe('performanceScoreFromPointsSV', () => {
  it('returns a/(a+b) for normal match: (12, 7) ≈ 0.6316', () => {
    const RESULT = performanceScoreFromPointsSV(12, 7);
    expect(RESULT).toBeCloseTo(12 / 19, 5);
  });

  it('returns 0.5 when both players score 0', () => {
    expect(performanceScoreFromPointsSV(0, 0)).toBe(0.5);
  });

  it('returns 1.0 when player A scores 6 and player B scores 0', () => {
    expect(performanceScoreFromPointsSV(6, 0)).toBe(1.0);
  });

  it('returns 0.0 when player A scores 0 and player B scores 6', () => {
    expect(performanceScoreFromPointsSV(0, 6)).toBe(0.0);
  });

  it('returns 0.5 when both players score 1', () => {
    expect(performanceScoreFromPointsSV(1, 1)).toBe(0.5);
  });

  it('always returns a result in [0, 1]', () => {
    const CASES: Array<[number, number]> = [
      [0, 0],
      [0, 6],
      [6, 0],
      [12, 7],
      [1, 1],
      [100, 1],
      [1, 100],
    ];
    for (const [A, B] of CASES) {
      const RESULT = performanceScoreFromPointsSV(A, B);
      expect(RESULT).toBeGreaterThanOrEqual(0);
      expect(RESULT).toBeLessThanOrEqual(1);
    }
  });
});

describe('applyEloForFreeForAllPerPlayerKSV', () => {
  const BASE_PLAYERS = (scores: number[]) =>
    scores.map((_score, _i) => ({
      userId: `user-${_i + 1}`,
      rating: 1500,
      score: _score,
    }));

  const UNIFORM_K: Record<string, number> = {
    'user-1': 32,
    'user-2': 32,
    'user-3': 32,
    'user-4': 32,
  };

  it('player with most points gains the highest rating in a symmetric 4-player match', () => {
    const PLAYERS = BASE_PLAYERS([12, 7, 5, 3]);
    const RESULTS = applyEloForFreeForAllPerPlayerKSV(PLAYERS, UNIFORM_K);

    const SORTED = [...RESULTS].sort((_a, _b) => _b.delta - _a.delta);
    expect(SORTED[0]!.userId).toBe('user-1');
  });

  it('dominant win produces larger delta than narrow win (all else equal)', () => {
    const DOMINANT_PLAYERS = [
      { userId: 'u1', rating: 1500, score: 12 },
      { userId: 'u2', rating: 1500, score: 0 },
      { userId: 'u3', rating: 1500, score: 6 },
      { userId: 'u4', rating: 1500, score: 6 },
    ];
    const NARROW_PLAYERS = [
      { userId: 'u1', rating: 1500, score: 7 },
      { userId: 'u2', rating: 1500, score: 6 },
      { userId: 'u3', rating: 1500, score: 6 },
      { userId: 'u4', rating: 1500, score: 6 },
    ];
    const K = { u1: 32, u2: 32, u3: 32, u4: 32 };
    const CLAMP = { min: 100, max: 3000 };

    const DOMINANT_RESULT = applyEloForFreeForAllPerPlayerKSV(DOMINANT_PLAYERS, K, CLAMP);
    const NARROW_RESULT = applyEloForFreeForAllPerPlayerKSV(NARROW_PLAYERS, K, CLAMP);

    const DOMINANT_WINNER = DOMINANT_RESULT.find((_r) => _r.userId === 'u1')!;
    const NARROW_WINNER = NARROW_RESULT.find((_r) => _r.userId === 'u1')!;

    expect(DOMINANT_WINNER.delta).toBeGreaterThan(NARROW_WINNER.delta);
  });

  it('never returns a rating below minRating (clamping floor)', () => {
    const PLAYERS = [
      { userId: 'u1', rating: 101, score: 0 },
      { userId: 'u2', rating: 1500, score: 10 },
      { userId: 'u3', rating: 1500, score: 10 },
      { userId: 'u4', rating: 1500, score: 10 },
    ];
    const K = { u1: 200, u2: 32, u3: 32, u4: 32 };
    const CLAMP = { min: 100, max: 3000 };

    const RESULTS = applyEloForFreeForAllPerPlayerKSV(PLAYERS, K, CLAMP);
    for (const R of RESULTS) {
      expect(R.newRating).toBeGreaterThanOrEqual(100);
    }
  });

  it('never returns a rating above maxRating (clamping ceiling)', () => {
    const PLAYERS = [
      { userId: 'u1', rating: 2999, score: 100 },
      { userId: 'u2', rating: 1000, score: 0 },
      { userId: 'u3', rating: 1000, score: 0 },
      { userId: 'u4', rating: 1000, score: 0 },
    ];
    const K = { u1: 200, u2: 32, u3: 32, u4: 32 };
    const CLAMP = { min: 100, max: 3000 };

    const RESULTS = applyEloForFreeForAllPerPlayerKSV(PLAYERS, K, CLAMP);
    for (const R of RESULTS) {
      expect(R.newRating).toBeLessThanOrEqual(3000);
    }
  });

  it('provisional player with doubled K gets doubled delta compared to normal K', () => {
    const PLAYERS = [
      { userId: 'u1', rating: 1500, score: 10 },
      { userId: 'u2', rating: 1500, score: 3 },
      { userId: 'u3', rating: 1500, score: 3 },
      { userId: 'u4', rating: 1500, score: 3 },
    ];
    const NORMAL_K = { u1: 32, u2: 32, u3: 32, u4: 32 };
    const PROVISIONAL_K = { u1: 64, u2: 32, u3: 32, u4: 32 };

    const NORMAL_RESULTS = applyEloForFreeForAllPerPlayerKSV(PLAYERS, NORMAL_K);
    const PROVISIONAL_RESULTS = applyEloForFreeForAllPerPlayerKSV(PLAYERS, PROVISIONAL_K);

    const NORMAL_U1 = NORMAL_RESULTS.find((_r) => _r.userId === 'u1')!;
    const PROVISIONAL_U1 = PROVISIONAL_RESULTS.find((_r) => _r.userId === 'u1')!;

    expect(PROVISIONAL_U1.delta).toBeCloseTo(NORMAL_U1.delta * 2, 5);
  });

  it('returns zero deltas when fewer than 2 players are passed', () => {
    const ONE_PLAYER = [{ userId: 'u1', rating: 1500, score: 10 }];
    const K = { u1: 32 };

    const RESULTS = applyEloForFreeForAllPerPlayerKSV(ONE_PLAYER, K);
    expect(RESULTS).toHaveLength(1);
    expect(RESULTS[0]!.delta).toBe(0);
    expect(RESULTS[0]!.newRating).toBe(1500);
  });

  it('favourite-wins delta is smaller than upset-wins delta with same score margin', () => {
    const SCORE_A = 10;
    const SCORE_B = 0;

    const FAVOURITE_WINS = [
      { userId: 'u1', rating: 1700, score: SCORE_A },
      { userId: 'u2', rating: 1500, score: SCORE_B },
      { userId: 'u3', rating: 1500, score: SCORE_B },
      { userId: 'u4', rating: 1500, score: SCORE_B },
    ];
    const UPSET_WINS = [
      { userId: 'u1', rating: 1500, score: SCORE_A },
      { userId: 'u2', rating: 1700, score: SCORE_B },
      { userId: 'u3', rating: 1500, score: SCORE_B },
      { userId: 'u4', rating: 1500, score: SCORE_B },
    ];
    const K = { u1: 32, u2: 32, u3: 32, u4: 32 };

    const FAV_RESULTS = applyEloForFreeForAllPerPlayerKSV(FAVOURITE_WINS, K);
    const UPSET_RESULTS = applyEloForFreeForAllPerPlayerKSV(UPSET_WINS, K);

    const FAV_WINNER = FAV_RESULTS.find((_r) => _r.userId === 'u1')!;
    const UPSET_WINNER = UPSET_RESULTS.find((_r) => _r.userId === 'u1')!;

    expect(FAV_WINNER.delta).toBeLessThan(UPSET_WINNER.delta);
  });
});
