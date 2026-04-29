export type EloGameResult = 0 | 0.5 | 1;

export type EloPlayerInput = {
  userId: string;
  rating: number;
  score: number;
};

export type EloPlayerOutput = {
  userId: string;
  previousRating: number;
  newRating: number;
  delta: number;
};

function clampSV(_value: number, _min: number, _max: number): number {
  return Math.min(_max, Math.max(_min, _value));
}

function expectedScoreSV(_ra: number, _rb: number): number {
  return 1 / (1 + 10 ** ((_rb - _ra) / 400));
}

function actualScoreFromPointsSV(_aPoints: number, _bPoints: number): EloGameResult {
  if (_aPoints > _bPoints) return 1;
  if (_aPoints < _bPoints) return 0;
  return 0.5;
}

/**
 * Elo para un match FFA (4 jugadores) basado en puntos por jugador.
 * Se computa por pares y se promedia por (n-1) para mantener deltas acotados.
 */
export function applyEloForFreeForAllSV(
  _players: EloPlayerInput[],
  _kFactor: number,
): EloPlayerOutput[] {
  if (_players.length < 2) return _players.map((_p) => ({ userId: _p.userId, previousRating: _p.rating, newRating: _p.rating, delta: 0 }));

  const N = _players.length;
  const DELTAS = new Map<string, number>(_players.map((_p) => [_p.userId, 0]));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const A = _players[i]!;
      const B = _players[j]!;

      const EA = expectedScoreSV(A.rating, B.rating);
      const EB = 1 - EA;
      const SA = actualScoreFromPointsSV(A.score, B.score);
      const SB: EloGameResult = (1 - SA) as EloGameResult;

      DELTAS.set(A.userId, (DELTAS.get(A.userId) ?? 0) + (SA - EA));
      DELTAS.set(B.userId, (DELTAS.get(B.userId) ?? 0) + (SB - EB));
    }
  }

  return _players.map((_p) => {
    const RAW = (DELTAS.get(_p.userId) ?? 0) / (N - 1);
    const DELTA = _kFactor * RAW;
    const NEW = _p.rating + DELTA;
    return {
      userId: _p.userId,
      previousRating: _p.rating,
      newRating: NEW,
      delta: DELTA,
    };
  });
}

export function applyEloForFreeForAllPerPlayerKSV(
  _players: EloPlayerInput[],
  _kFactorByUserId: Record<string, number>,
  _clamp?: { min: number; max: number },
): EloPlayerOutput[] {
  if (_players.length < 2) {
    return _players.map((_p) => ({
      userId: _p.userId,
      previousRating: _p.rating,
      newRating: _p.rating,
      delta: 0,
    }));
  }

  const N = _players.length;
  const DELTAS = new Map<string, number>(_players.map((_p) => [_p.userId, 0]));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const A = _players[i]!;
      const B = _players[j]!;

      const EA = expectedScoreSV(A.rating, B.rating);
      const EB = 1 - EA;
      const SA = actualScoreFromPointsSV(A.score, B.score);
      const SB: EloGameResult = (1 - SA) as EloGameResult;

      DELTAS.set(A.userId, (DELTAS.get(A.userId) ?? 0) + (SA - EA));
      DELTAS.set(B.userId, (DELTAS.get(B.userId) ?? 0) + (SB - EB));
    }
  }

  return _players.map((_p) => {
    const RAW = (DELTAS.get(_p.userId) ?? 0) / (N - 1);
    const K = _kFactorByUserId[_p.userId] ?? 0;
    const DELTA = K * RAW;
    const NEXT = _p.rating + DELTA;
    const CLAMPED =
      _clamp === undefined ? NEXT : clampSV(NEXT, _clamp.min, _clamp.max);
    return {
      userId: _p.userId,
      previousRating: _p.rating,
      newRating: CLAMPED,
      delta: CLAMPED - _p.rating,
    };
  });
}

