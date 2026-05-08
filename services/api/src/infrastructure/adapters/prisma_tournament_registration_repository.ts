import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import { PRISMA } from '../prisma_client.js';

function mapRowSV(_row: {
  id: string;
  tournamentId: string;
  userId: string;
  status: string;
  createdAt: Date;
}): TournamentRegistrationDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    userId: _row.userId,
    status: _row.status,
    createdAt: _row.createdAt,
  };
}

export class PrismaTournamentRegistrationRepository implements TournamentRegistrationRepository {
  async upsertSV(_input: {
    tournamentId: string;
    userId: string;
    status?: string;
  }): Promise<{ created: boolean; registration: TournamentRegistrationDTO }> {
    const EXISTING = await PRISMA.tournamentRegistration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: _input.tournamentId,
          userId: _input.userId,
        },
      },
    });

    if (EXISTING !== null) {
      const UPDATED = await PRISMA.tournamentRegistration.update({
        where: { id: EXISTING.id },
        data: {
          status: (_input.status ?? 'PENDING') as never,
        },
      });
      return { created: false, registration: mapRowSV(UPDATED) };
    }

    const CREATED = await PRISMA.tournamentRegistration.create({
      data: {
        tournamentId: _input.tournamentId,
        userId: _input.userId,
        status: (_input.status ?? 'PENDING') as never,
      },
    });
    return { created: true, registration: mapRowSV(CREATED) };
  }

  async findByTournamentAndUserSV(
    _tournamentId: string,
    _userId: string,
  ): Promise<TournamentRegistrationDTO | null> {
    const ROW = await PRISMA.tournamentRegistration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: _tournamentId,
          userId: _userId,
        },
      },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async listByTournamentIdSV(_tournamentId: string): Promise<TournamentRegistrationDTO[]> {
    const ROWS = await PRISMA.tournamentRegistration.findMany({
      where: { tournamentId: _tournamentId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapRowSV);
  }

  async countByTournamentIdSV(_tournamentId: string): Promise<number> {
    return PRISMA.tournamentRegistration.count({
      where: { tournamentId: _tournamentId, status: { not: 'WITHDRAWN' } },
    });
  }

  async disableByTournamentAndUserSV(_tournamentId: string, _userId: string): Promise<boolean> {
    const EXISTING = await PRISMA.tournamentRegistration.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: _tournamentId,
          userId: _userId,
        },
      },
    });
    if (EXISTING === null) return false;

    await PRISMA.tournamentRegistration.update({
      where: { id: EXISTING.id },
      data: { status: 'WITHDRAWN' as never },
    });
    return true;
  }
}
