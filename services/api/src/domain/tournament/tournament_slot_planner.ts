export type TournamentMatchRef = {
  roundNumber: number;
  matchNumber: number;
};

export type PlannedMatchSlot = TournamentMatchRef & {
  courtId: string;
  scheduledAt: Date;
};

export type PlanTournamentMatchSlotsInput = {
  plans: TournamentMatchRef[];
  /** Canchas de la sede, en el orden en que conviene usarlas. */
  courtIds: string[];
  startsAt: Date;
  slotMinutes: number;
  /** Turnos ya tomados, con clave `courtId|scheduledAtISO`. */
  occupiedSlots: ReadonlySet<string>;
  /** Cuantos turnos consecutivos se miran antes de rendirse. */
  maxSlotsToScan?: number;
};

/** Clave de un turno; el mismo formato que espera `occupiedSlots`. */
export function slotKeySV(_courtId: string, _scheduledAt: Date): string {
  return `${_courtId}|${_scheduledAt.toISOString()}`;
}

const DEFAULT_MAX_SLOTS_TO_SCAN = 24 * 14;

/**
 * Reparte los partidos del cuadro en canchas y horarios concretos.
 *
 * Hasta ahora todos los partidos heredaban `Tournament.startsAt` y quedaban sin
 * cancha, asi que el jugador no podia saber cuando ni donde jugaba: el dato no
 * existia.
 *
 * Dos reglas mandan:
 * 1. Los partidos de una misma ronda se juegan en paralelo, en canchas distintas.
 * 2. Una ronda no empieza hasta que termino la anterior, porque sus cruces
 *    dependen de esos resultados.
 *
 * Los turnos que la sede ya tiene tomados se saltean: el torneo compite por las
 * mismas canchas que las reservas sueltas y no puede pisarlas.
 *
 * ponytail: asignacion first-fit y secuencial. No optimiza descanso entre
 * partidos de un mismo jugador ni reparte por preferencia de cancha; si hace
 * falta, el organizador mueve el partido a mano. Tampoco cruza sedes: un torneo
 * juega en una.
 */
export function planTournamentMatchSlotsSV(
  _input: PlanTournamentMatchSlotsInput,
): { slots: PlannedMatchSlot[]; unplaced: TournamentMatchRef[] } {
  const SLOT_MS = _input.slotMinutes * 60 * 1000;
  const MAX_SCAN = _input.maxSlotsToScan ?? DEFAULT_MAX_SLOTS_TO_SCAN;

  const TAKEN = new Set(_input.occupiedSlots);
  const SLOTS: PlannedMatchSlot[] = [];
  const UNPLACED: TournamentMatchRef[] = [];

  //? Los partidos se ubican en orden de ronda para que la regla 2 se cumpla sola.
  const ORDERED = [..._input.plans].sort(
    (_a, _b) => _a.roundNumber - _b.roundNumber || _a.matchNumber - _b.matchNumber,
  );

  //? Desde que turno puede arrancar cada ronda. La ronda N no puede empezar
  //? antes de que el ultimo partido de la N-1 haya terminado.
  let roundFloorIndex = 0;
  let currentRound = ORDERED[0]?.roundNumber;

  for (const PLAN of ORDERED) {
    if (PLAN.roundNumber !== currentRound) {
      //? La ronda nueva arranca despues del ultimo turno usado por la anterior.
      roundFloorIndex = SLOTS.reduce(
        (_max, _s) => Math.max(_max, slotIndexSV(_s.scheduledAt, _input.startsAt, SLOT_MS) + 1),
        roundFloorIndex,
      );
      currentRound = PLAN.roundNumber;
    }

    const PLACED = placeSV(PLAN, roundFloorIndex);
    if (PLACED === null) {
      UNPLACED.push({ roundNumber: PLAN.roundNumber, matchNumber: PLAN.matchNumber });
      continue;
    }
    TAKEN.add(slotKeySV(PLACED.courtId, PLACED.scheduledAt));
    SLOTS.push(PLACED);
  }

  return { slots: SLOTS, unplaced: UNPLACED };

  function placeSV(_plan: TournamentMatchRef, _fromIndex: number): PlannedMatchSlot | null {
    for (let offset = 0; offset < MAX_SCAN; offset += 1) {
      const AT = new Date(_input.startsAt.getTime() + (_fromIndex + offset) * SLOT_MS);
      for (const COURT_ID of _input.courtIds) {
        if (TAKEN.has(slotKeySV(COURT_ID, AT))) continue;
        return {
          roundNumber: _plan.roundNumber,
          matchNumber: _plan.matchNumber,
          courtId: COURT_ID,
          scheduledAt: AT,
        };
      }
    }
    return null;
  }
}

function slotIndexSV(_at: Date, _startsAt: Date, _slotMs: number): number {
  return Math.round((_at.getTime() - _startsAt.getTime()) / _slotMs);
}
