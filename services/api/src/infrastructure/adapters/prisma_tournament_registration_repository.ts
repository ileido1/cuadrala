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
    return PRISMA.$transaction(async (_tx) => {
      //? 1. Intentar actualizar existente (si count = 0, no existe)
      const UPDATED = await _tx.tournamentRegistration.updateMany({
        where: {
          tournamentId: _input.tournamentId,
          userId: _input.userId,
        },
        data: { status: (_input.status ?? 'PENDING') as never },
      });

      if (UPDATED.count > 0) {
        //? Actualización exitosa: obtener el registro actualizado
        const REGISTRATION = await _tx.tournamentRegistration.findUniqueOrThrow({
          where: {
            tournamentId_userId: {
              tournamentId: _input.tournamentId,
              userId: _input.userId,
            },
          },
        });
        return { created: false, registration: mapRowSV(REGISTRATION) };
      }

      //? 2. No existe: crear nuevo registro
      const CREATED = await _tx.tournamentRegistration.create({
        data: {
          tournamentId: _input.tournamentId,
          userId: _input.userId,
          status: (_input.status ?? 'PENDING') as never,
        },
      });
      return { created: true, registration: mapRowSV(CREATED) };
    });
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
    //? Una sola query: updateMany retorna count, sin N+1.
    const RESULT = await PRISMA.tournamentRegistration.updateMany({
      where: {
        tournamentId: _tournamentId,
        userId: _userId,
      },
      data: { status: 'WITHDRAWN' as never },
    });
    return RESULT.count > 0;
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
    //? Una sola query: update retorna el registro o lanza error. Capturar NotFoundError para retornar null.
    try {
      const UPDATED = await PRISMA.tournamentRegistration.update({
        where: { id: _id },
        data: { status: _status as never },
      });
      return mapRowSV(UPDATED);
    } catch (error) {
      //? Prisma lanza P2025 (NotFoundError) si el registro no existe.
      if ((error as any).code === 'P2025') return null;
      throw error;
    }
  }

  async deleteByIdSV(_id: string): Promise<boolean> {
    //? Una sola query: delete lanza P2025 si no existe. Capturar para retornar false.
    try {
      await PRISMA.tournamentRegistration.delete({ where: { id: _id } });
      return true;
    } catch (error) {
      if ((error as any).code === 'P2025') return false;
      throw error;
    }
  }
}
