import type {
  CreateGuestTournamentRegistrationDTO,
  TournamentRegistrationDTO,
  TournamentRegistrationRepository,
} from '../../domain/ports/tournament_registration_repository.js';
import { PRISMA } from '../prisma_client.js';

function mapRowSV(_row: {
  id: string;
  tournamentId: string;
  userId: string | null;
  user?: { name: string } | null;
  status: string;
  registrationType: string;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  registeredByUserId: string | null;
  createdAt: Date;
}): TournamentRegistrationDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    userId: _row.userId,
    userName: _row.user?.name ?? null,
    status: _row.status,
    registrationType: _row.registrationType as 'AUTHENTICATED' | 'GUEST',
    guestName: _row.guestName,
    guestPhone: _row.guestPhone,
    guestEmail: _row.guestEmail,
    registeredByUserId: _row.registeredByUserId,
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
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapRowSV);
  }

  async listByTournamentIdAndStatusSV(
    _tournamentId: string,
    _status: string,
  ): Promise<TournamentRegistrationDTO[]> {
    const ROWS = await PRISMA.tournamentRegistration.findMany({
      where: { tournamentId: _tournamentId, status: _status as never },
      include: { user: { select: { name: true } } },
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

  async findByIdSV(_id: string): Promise<TournamentRegistrationDTO | null> {
    const ROW = await PRISMA.tournamentRegistration.findUnique({ where: { id: _id } });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async createGuestSV(_input: CreateGuestTournamentRegistrationDTO): Promise<TournamentRegistrationDTO> {
    const CREATED = await PRISMA.tournamentRegistration.create({
      data: {
        tournamentId: _input.tournamentId,
        registrationType: 'GUEST' as never,
        status: 'PENDING' as never,
        guestName: _input.guestName,
        guestPhone: _input.guestPhone ?? null,
        guestEmail: _input.guestEmail ?? null,
        registeredByUserId: _input.registeredByUserId,
      },
    });
    return mapRowSV(CREATED);
  }

  async updateStatusByIdSV(_id: string, _status: string): Promise<TournamentRegistrationDTO | null> {
    const EXISTING = await PRISMA.tournamentRegistration.findUnique({ where: { id: _id } });
    if (EXISTING === null) return null;

    const UPDATED = await PRISMA.tournamentRegistration.update({
      where: { id: _id },
      data: { status: _status as never },
    });
    return mapRowSV(UPDATED);
  }

  async deleteByIdSV(_id: string): Promise<boolean> {
    const EXISTING = await PRISMA.tournamentRegistration.findUnique({ where: { id: _id } });
    if (EXISTING === null) return false;

    await PRISMA.tournamentRegistration.delete({ where: { id: _id } });
    return true;
  }
}
