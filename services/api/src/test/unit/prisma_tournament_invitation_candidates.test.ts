import { beforeEach, describe, expect, it, vi } from 'vitest';

const FIND_MANY = vi.hoisted(() => vi.fn());
vi.mock('../../infrastructure/prisma_client.js', () => ({
  PRISMA: { user: { findMany: FIND_MANY } },
}));

import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';

describe('PrismaUserRepository.searchTournamentInvitationCandidatesSV', () => {
  beforeEach(() => FIND_MANY.mockReset().mockResolvedValue([]));

  it('should search names case-insensitively and exclude every existing roster or invite entry', async () => {
    const repository = new PrismaUserRepository();
    await repository.searchTournamentInvitationCandidatesSV('t-1', 'Ada', 20);

    expect(FIND_MANY).toHaveBeenCalledWith({
      where: {
        name: { contains: 'Ada', mode: 'insensitive' },
        tournamentRegistrations: { none: { tournamentId: 't-1' } },
        invitationsReceived: { none: { tournamentId: 't-1' } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
  });
});
