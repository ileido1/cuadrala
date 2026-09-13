/**
 * Una fila de puntaje de un participante en un partido, con su lado (`teamLabel`)
 * si el formato lo tiene (duplas fijas/americano). En singles `teamLabel` es
 * `null` — cada `userId` es su propio lado.
 */
export type MatchParticipantScoreSV = {
  userId: string;
  teamLabel: string | null;
  points: number;
};

export type MatchSideTotalSV = {
  /** `teamLabel` cuando existe; si no, el propio `userId` (lado individual). */
  sideKey: string;
  userIds: string[];
  totalPoints: number;
};

/**
 * Agrupa los puntajes de un partido por lado y suma los puntos de cada lado.
 *
 * `MatchResultScore` (`schema.prisma`) guarda una fila por usuario, sin
 * columna de lado: el agrupamiento por dupla vive en `MatchParticipant.teamLabel`.
 * Comparar filas individuales (max/min) en vez de sumas por lado da el ganador
 * equivocado en duplas: A=[15,15] (suma 30) vs B=[20,10] (suma 30) es un
 * empate, aunque B tenga la fila individual más alta (20).
 */
export function aggregateMatchSideTotalsSV(
  _scores: MatchParticipantScoreSV[],
): MatchSideTotalSV[] {
  const BY_SIDE = new Map<string, MatchSideTotalSV>();

  for (const _score of _scores) {
    //? Sin teamLabel (o con uno único por participante) cada jugador es su
    //? propio lado: esto reduce singles a un caso particular de esta misma
    //? lógica, sin ramas separadas.
    const SIDE_KEY = _score.teamLabel ?? _score.userId;
    const CURRENT = BY_SIDE.get(SIDE_KEY) ?? { sideKey: SIDE_KEY, userIds: [], totalPoints: 0 };
    CURRENT.userIds.push(_score.userId);
    CURRENT.totalPoints += _score.points;
    BY_SIDE.set(SIDE_KEY, CURRENT);
  }

  return [...BY_SIDE.values()];
}

/**
 * Resuelve los `userId` del lado ganador de un partido, sumando puntos por
 * lado (nunca comparando filas individuales). Si todos los lados empatan en
 * el máximo, no hay ganador: devuelve `[]`.
 */
export function resolveMatchWinningUserIdsSV(_scores: MatchParticipantScoreSV[]): string[] {
  const SIDES = aggregateMatchSideTotalsSV(_scores);
  if (SIDES.length === 0) return [];

  const MAX = Math.max(...SIDES.map((_side) => _side.totalPoints));
  const WINNING_SIDES = SIDES.filter((_side) => _side.totalPoints === MAX);
  if (WINNING_SIDES.length !== 1) return [];

  return WINNING_SIDES[0]!.userIds;
}

/**
 * Un participante materializado (`MatchParticipant`), tal como lo necesita
 * `groupMatchParticipantsBySideSV`: sin puntos, porque agrupa el cuadro antes
 * de que exista un resultado.
 */
export type MatchParticipantSideMemberSV = {
  userId: string | null;
  teamLabel: string | null;
  tournamentRegistrationId: string;
};

export type MatchParticipantSideSV = {
  /** `teamLabel` cuando existe; si no, el propio `userId`, o la inscripción del huésped. */
  sideKey: string;
  userIds: Array<string | null>;
};

/**
 * Agrupa participantes de un partido por lado, con la misma regla que
 * `aggregateMatchSideTotalsSV` (`teamLabel ?? userId`), pero tolerante a
 * huéspedes sin `userId`: en ese caso cae a `tournamentRegistrationId` para no
 * juntar dos huéspedes de singles distintos en el mismo lado.
 */
export function groupMatchParticipantsBySideSV(
  _participants: MatchParticipantSideMemberSV[],
): MatchParticipantSideSV[] {
  const BY_SIDE = new Map<string, MatchParticipantSideSV>();

  for (const _p of _participants) {
    const SIDE_KEY = _p.teamLabel ?? _p.userId ?? _p.tournamentRegistrationId;
    const CURRENT = BY_SIDE.get(SIDE_KEY) ?? { sideKey: SIDE_KEY, userIds: [] };
    CURRENT.userIds.push(_p.userId);
    BY_SIDE.set(SIDE_KEY, CURRENT);
  }

  return [...BY_SIDE.values()];
}
