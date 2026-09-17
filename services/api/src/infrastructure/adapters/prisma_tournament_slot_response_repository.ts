import type {
  TournamentSlotHoldLifecycleRepository,
  TournamentSlotResponseRepository,
} from '../../application/use_cases/respond_tournament_slot.use_case.js';
import type { TournamentSlotResponseValue } from '../../domain/tournament/tournament_slot_decision.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentSlotResponseRepository implements TournamentSlotResponseRepository {
  async upsertSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    userId?: string;
    tournamentRegistrationId?: string;
    response: TournamentSlotResponseValue;
  }): Promise<void> {
    //? Upsert y no create: cambiar de opinion antes de que se resuelva el turno
    //? es legitimo, y duplicar respuestas del mismo jugador romperia el conteo.
    const WHERE =
      _input.userId !== undefined
        ? {
            tournamentId_roundNumber_matchNumber_userId: {
              tournamentId: _input.tournamentId,
              roundNumber: _input.roundNumber,
              matchNumber: _input.matchNumber,
              userId: _input.userId,
            },
          }
        : {
            tournamentId_roundNumber_matchNumber_tournamentRegistrationId: {
              tournamentId: _input.tournamentId,
              roundNumber: _input.roundNumber,
              matchNumber: _input.matchNumber,
              tournamentRegistrationId: _input.tournamentRegistrationId!,
            },
          };
    const USER_ID = _input.userId ?? null;
    const TOURNAMENT_REGISTRATION_ID = _input.tournamentRegistrationId ?? null;
    await PRISMA.tournamentSlotResponse.upsert({
      where: WHERE,
      create: {
        tournamentId: _input.tournamentId,
        roundNumber: _input.roundNumber,
        matchNumber: _input.matchNumber,
        userId: USER_ID,
        tournamentRegistrationId: TOURNAMENT_REGISTRATION_ID,
        response: _input.response,
      },
      update: { response: _input.response },
    });
  }

  async listByMatchSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
  }): Promise<
    Array<{
      userId: string | null;
      tournamentRegistrationId: string | null;
      response: TournamentSlotResponseValue;
    }>
  > {
    return PRISMA.tournamentSlotResponse.findMany({
      where: _input,
      select: { userId: true, tournamentRegistrationId: true, response: true },
    });
  }

  async deleteByMatchSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
  }): Promise<void> {
    await PRISMA.tournamentSlotResponse.deleteMany({ where: _input });
  }
}

export class PrismaTournamentSlotHoldLifecycleRepository implements TournamentSlotHoldLifecycleRepository {
  async confirmHoldSV(_input: { courtId: string; scheduledAt: Date }): Promise<boolean> {
    //? `updateMany` con el estado en el WHERE: si el turno dejo de estar
    //? apartado (vencio, o el organizador lo movio) no se pisa nada.
    const RES = await PRISMA.reservation.updateMany({
      where: { courtId: _input.courtId, scheduledAt: _input.scheduledAt, status: 'HELD' },
      data: { status: 'CONFIRMED', holdExpiresAt: null },
    });
    return RES.count > 0;
  }

  async releaseHoldSV(_input: { courtId: string; scheduledAt: Date }): Promise<boolean> {
    const RES = await PRISMA.reservation.updateMany({
      where: { courtId: _input.courtId, scheduledAt: _input.scheduledAt, status: 'HELD' },
      data: { status: 'EXPIRED', holdExpiresAt: null },
    });
    return RES.count > 0;
  }
}
