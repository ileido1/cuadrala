import { createHash, randomBytes } from 'node:crypto';

import type {
  TournamentInviteLinkDTO,
  TournamentInviteLinkRegistrantDTO,
  TournamentInviteLinkRepository,
  TournamentInviteLinkWithRegistrantsDTO,
} from '../../domain/ports/tournament_invite_link_repository.js';
import { PRISMA } from '../prisma_client.js';

/**
 * @name    :hashTokenSV
 * @version :1.0.0
 * @description :sha256 hex del token crudo. Mismo patrón que
 * `PrismaTournamentGuestScheduleTokenRepository` — el token crudo nunca se
 * compara ni se persiste, solo su hash (NFR-TIL-001).
 */
const hashTokenSV = (_token: string): string => createHash('sha256').update(_token).digest('hex');

function mapLinkRowSV(_row: {
  id: string;
  tournamentId: string;
  createdByUserId: string;
  expiresAt: Date;
  maxUses: number | null;
  usesCount: number;
  revokedAt: Date | null;
  createdAt: Date;
}): TournamentInviteLinkDTO {
  return {
    id: _row.id,
    tournamentId: _row.tournamentId,
    createdByUserId: _row.createdByUserId,
    expiresAt: _row.expiresAt,
    maxUses: _row.maxUses,
    usesCount: _row.usesCount,
    revokedAt: _row.revokedAt,
    createdAt: _row.createdAt,
  };
}

function mapRegistrantRowSV(_row: {
  id: string;
  registrationType: string;
  guestName: string | null;
  user?: { name: string } | null;
  createdAt: Date;
}): TournamentInviteLinkRegistrantDTO {
  return {
    registrationId: _row.id,
    type: _row.registrationType as 'AUTHENTICATED' | 'GUEST',
    displayName: (_row.registrationType === 'GUEST' ? _row.guestName : _row.user?.name) ?? '',
    registeredAt: _row.createdAt,
  };
}

export class PrismaTournamentInviteLinkRepository implements TournamentInviteLinkRepository {
  async createSV(_input: {
    tournamentId: string;
    createdByUserId: string;
    expiresAt: Date;
    maxUses: number | null;
  }): Promise<{ link: TournamentInviteLinkDTO; token: string }> {
    const TOKEN = randomBytes(32).toString('base64url');
    const CREATED = await PRISMA.tournamentInviteLink.create({
      data: {
        tournamentId: _input.tournamentId,
        createdByUserId: _input.createdByUserId,
        tokenHash: hashTokenSV(TOKEN),
        expiresAt: _input.expiresAt,
        maxUses: _input.maxUses,
      },
    });
    return { link: mapLinkRowSV(CREATED), token: TOKEN };
  }

  async findByTokenHashSV(_rawToken: string): Promise<TournamentInviteLinkDTO | null> {
    const ROW = await PRISMA.tournamentInviteLink.findUnique({
      where: { tokenHash: hashTokenSV(_rawToken) },
    });
    return ROW === null ? null : mapLinkRowSV(ROW);
  }

  async findByIdAndTournamentIdSV(
    _id: string,
    _tournamentId: string,
  ): Promise<TournamentInviteLinkDTO | null> {
    const ROW = await PRISMA.tournamentInviteLink.findFirst({
      where: { id: _id, tournamentId: _tournamentId },
    });
    return ROW === null ? null : mapLinkRowSV(ROW);
  }

  async listByTournamentIdWithRegistrantsSV(
    _tournamentId: string,
  ): Promise<TournamentInviteLinkWithRegistrantsDTO[]> {
    const ROWS = await PRISMA.tournamentInviteLink.findMany({
      where: { tournamentId: _tournamentId },
      include: {
        registrations: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ROWS.map((_row) => ({
      ...mapLinkRowSV(_row),
      registrants: _row.registrations.map(mapRegistrantRowSV),
    }));
  }

  async incrementUsesCountSV(_id: string): Promise<void> {
    await PRISMA.tournamentInviteLink.update({
      where: { id: _id },
      data: { usesCount: { increment: 1 } },
    });
  }

  async revokeSV(_id: string): Promise<void> {
    //? Idempotente: solo escribe si todavía está activo (revokedAt: null), así
    //? una segunda llamada no pisa el revokedAt original ni falla si el id no existe.
    await PRISMA.tournamentInviteLink.updateMany({
      where: { id: _id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
