import { createHash, randomBytes } from 'node:crypto';
import type {
  GuestScheduleTokenRecord,
  TournamentGuestScheduleTokenRepository,
} from '../../domain/ports/tournament_guest_schedule_token_repository.js';
import { PRISMA } from '../prisma_client.js';

const hashTokenSV = (_token: string): string => createHash('sha256').update(_token).digest('hex');

export class PrismaTournamentGuestScheduleTokenRepository implements TournamentGuestScheduleTokenRepository {
  async issueSV(_registrationId: string, _expiresAt: Date): Promise<string> {
    const TOKEN = randomBytes(32).toString('base64url');
    await PRISMA.tournamentGuestScheduleToken.create({
      data: {
        tournamentRegistrationId: _registrationId,
        tokenHash: hashTokenSV(TOKEN),
        expiresAt: _expiresAt,
      },
    });
    return TOKEN;
  }

  async findByHashSV(_tokenHash: string): Promise<GuestScheduleTokenRecord | null> {
    const ROW = await PRISMA.tournamentGuestScheduleToken.findUnique({
      where: { tokenHash: hashTokenSV(_tokenHash) },
      include: {
        tournamentRegistration: {
          select: { tournamentId: true, guestName: true, guestEmail: true },
        },
      },
    });
    if (ROW === null) return null;
    return {
      id: ROW.id,
      tokenHash: ROW.tokenHash,
      registrationId: ROW.tournamentRegistrationId,
      tournamentId: ROW.tournamentRegistration.tournamentId,
      guestName: ROW.tournamentRegistration.guestName,
      guestEmail: ROW.tournamentRegistration.guestEmail,
      expiresAt: ROW.expiresAt,
      usedAt: ROW.usedAt,
    };
  }

  async markUsedSV(_tokenId: string): Promise<void> {
    await PRISMA.tournamentGuestScheduleToken.update({
      where: { id: _tokenId },
      data: { usedAt: new Date() },
    });
  }
}
