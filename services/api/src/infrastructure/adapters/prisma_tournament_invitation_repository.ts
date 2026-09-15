import type {
  CreateTournamentInvitationDTO,
  TournamentInvitationDTO,
  TournamentInvitationRepository,
} from '../../domain/ports/tournament_invitation_repository.js';
import { PRISMA } from '../prisma_client.js';

export function mapRowSV(_row: {
  id: string;
  tournamentId: string;
  invitedUserId: string;
  createdByUserId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  invitedUser: { name: string } | null;
}): TournamentInvitationDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    invitedUserId: _row.invitedUserId,
    invitedUserName: _row.invitedUser?.name ?? null,
    createdByUserId: _row.createdByUserId,
    status: _row.status,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaTournamentInvitationRepository implements TournamentInvitationRepository {
  async createSV(_input: CreateTournamentInvitationDTO): Promise<TournamentInvitationDTO> {
    const CREATED = await PRISMA.tournamentInvitation.create({
      data: {
        tournamentId: _input.tournamentId,
        invitedUserId: _input.invitedUserId,
        createdByUserId: _input.createdByUserId,
      },
      include: { invitedUser: { select: { name: true } } },
    });
    return mapRowSV(CREATED);
  }

  async findByIdSV(_id: string): Promise<TournamentInvitationDTO | null> {
    const ROW = await PRISMA.tournamentInvitation.findUnique({
      where: { id: _id },
      include: { invitedUser: { select: { name: true } } },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async findByTournamentAndUserSV(
    _tournamentId: string,
    _invitedUserId: string,
  ): Promise<TournamentInvitationDTO | null> {
    const ROW = await PRISMA.tournamentInvitation.findUnique({
      where: {
        tournamentId_invitedUserId: {
          tournamentId: _tournamentId,
          invitedUserId: _invitedUserId,
        },
      },
      include: { invitedUser: { select: { name: true } } },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async listByTournamentIdSV(_tournamentId: string): Promise<TournamentInvitationDTO[]> {
    const ROWS = await PRISMA.tournamentInvitation.findMany({
      where: { tournamentId: _tournamentId },
      orderBy: { createdAt: 'asc' },
      include: { invitedUser: { select: { name: true } } },
    });
    return ROWS.map(mapRowSV);
  }

  async updateStatusSV(_id: string, _status: string): Promise<TournamentInvitationDTO | null> {
    const EXISTING = await PRISMA.tournamentInvitation.findUnique({ where: { id: _id } });
    if (EXISTING === null) return null;

    const UPDATED = await PRISMA.tournamentInvitation.update({
      where: { id: _id },
      data: { status: _status as never },
      include: { invitedUser: { select: { name: true } } },
    });
    return mapRowSV(UPDATED);
  }
}
