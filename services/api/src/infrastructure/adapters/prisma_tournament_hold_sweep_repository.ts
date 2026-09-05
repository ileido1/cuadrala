import type {
  ExpiredHoldDTO,
  TournamentHoldSweepRepository,
} from '../../application/use_cases/expire_tournament_slot_holds.use_case.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentHoldSweepRepository implements TournamentHoldSweepRepository {
  async listExpiredHoldsSV(_now: Date, _limit: number): Promise<ExpiredHoldDTO[]> {
    //? Los turnos de torneo se apartan con `type: MATCH` y sin `matchId`: los
    //? partidos recien se materializan al arrancar el torneo.
    const ROWS = await PRISMA.reservation.findMany({
      where: {
        status: 'HELD',
        OR: [{ holdExpiresAt: { lte: _now } }, { holdExpiresAt: null }],
      },
      select: { id: true, courtId: true, scheduledAt: true, venueId: true },
      orderBy: { scheduledAt: 'asc' },
      take: _limit,
    });
    if (ROWS.length === 0) return [];

    //? El torneo se resuelve por la sede y el turno: el hold no guarda
    //? `tournamentId` propio, lo trae el calendario que lo aparto.
    const SCHEDULES = await PRISMA.tournamentSchedule.findMany({
      where: { tournament: { venueId: { in: [...new Set(ROWS.map((_r) => _r.venueId))] } } },
      select: {
        slotPlan: true,
        tournament: {
          select: { id: true, name: true, categoryId: true, organizerUserId: true },
        },
      },
    });

    const BY_SLOT = new Map<string, (typeof SCHEDULES)[number]['tournament']>();
    for (const SCHEDULE of SCHEDULES) {
      if (!Array.isArray(SCHEDULE.slotPlan)) continue;
      for (const SLOT of SCHEDULE.slotPlan) {
        if (typeof SLOT !== 'object' || SLOT === null) continue;
        const S = SLOT as Record<string, unknown>;
        if (typeof S.courtId !== 'string' || typeof S.scheduledAt !== 'string') continue;
        BY_SLOT.set(`${S.courtId}|${new Date(S.scheduledAt).toISOString()}`, SCHEDULE.tournament);
      }
    }

    const HOLDS: ExpiredHoldDTO[] = [];
    for (const ROW of ROWS) {
      const TOURNAMENT = BY_SLOT.get(`${ROW.courtId}|${ROW.scheduledAt.toISOString()}`);
      //? Un HELD que no pertenece a ningun cuadro no es de un torneo: lo suelta
      //? quien lo haya creado, no este barrido.
      if (TOURNAMENT === undefined) continue;
      HOLDS.push({
        reservationId: ROW.id,
        tournamentId: TOURNAMENT.id,
        categoryId: TOURNAMENT.categoryId,
        organizerUserId: TOURNAMENT.organizerUserId,
        tournamentName: TOURNAMENT.name,
      });
    }
    return HOLDS;
  }

  async markExpiredSV(_reservationIds: string[]): Promise<number> {
    //? El estado va en el WHERE: si alguien confirmo el turno entre el listado
    //? y este update, no se pisa una reserva firme.
    const RES = await PRISMA.reservation.updateMany({
      where: { id: { in: _reservationIds }, status: 'HELD' },
      data: { status: 'EXPIRED', holdExpiresAt: null },
    });
    return RES.count;
  }
}
