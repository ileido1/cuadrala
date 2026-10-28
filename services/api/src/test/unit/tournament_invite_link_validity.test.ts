import { describe, expect, it } from 'vitest';

import { assertTournamentInviteLinkUsableSV } from '../../domain/tournament/tournament_invite_link_validity.js';
import type { TournamentInviteLinkDTO } from '../../domain/ports/tournament_invite_link_repository.js';

/** Link sano de referencia: ninguna de las tres condiciones de rechazo aplica. */
const HEALTHY_LINK: TournamentInviteLinkDTO = {
  id: 'link-1',
  tournamentId: 'tournament-1',
  createdByUserId: 'user-1',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  maxUses: null,
  usesCount: 0,
  revokedAt: null,
  createdAt: new Date(),
};

describe('assertTournamentInviteLinkUsableSV', () => {
  it('should not throw when the link is expired-free, not revoked and has uses left', () => {
    expect(() => assertTournamentInviteLinkUsableSV(HEALTHY_LINK)).not.toThrow();
  });

  it('should throw 410 ENLACE_INVALIDO when expiresAt is in the past', () => {
    const EXPIRED_LINK: TournamentInviteLinkDTO = {
      ...HEALTHY_LINK,
      expiresAt: new Date(Date.now() - 1000),
    };

    try {
      assertTournamentInviteLinkUsableSV(EXPIRED_LINK);
      expect.unreachable('should have thrown');
    } catch (_error) {
      expect((_error as { code: string }).code).toBe('ENLACE_INVALIDO');
      expect((_error as { statusCode: number }).statusCode).toBe(410);
    }
  });

  it('should throw 409 ENLACE_REVOCADO when revokedAt is set', () => {
    const REVOKED_LINK: TournamentInviteLinkDTO = {
      ...HEALTHY_LINK,
      revokedAt: new Date(),
    };

    try {
      assertTournamentInviteLinkUsableSV(REVOKED_LINK);
      expect.unreachable('should have thrown');
    } catch (_error) {
      expect((_error as { code: string }).code).toBe('ENLACE_REVOCADO');
      expect((_error as { statusCode: number }).statusCode).toBe(409);
    }
  });

  it('should throw 409 ENLACE_AGOTADO when usesCount reached maxUses', () => {
    const EXHAUSTED_LINK: TournamentInviteLinkDTO = {
      ...HEALTHY_LINK,
      maxUses: 5,
      usesCount: 5,
    };

    try {
      assertTournamentInviteLinkUsableSV(EXHAUSTED_LINK);
      expect.unreachable('should have thrown');
    } catch (_error) {
      expect((_error as { code: string }).code).toBe('ENLACE_AGOTADO');
      expect((_error as { statusCode: number }).statusCode).toBe(409);
    }
  });
});
