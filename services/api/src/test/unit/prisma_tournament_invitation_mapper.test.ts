import { describe, expect, it } from 'vitest';

import { mapRowSV } from '../../infrastructure/adapters/prisma_tournament_invitation_repository.js';

const ROW = {
  id: 'inv1',
  tournamentId: 't1',
  invitedUserId: 'u1',
  createdByUserId: 'u2',
  status: 'PENDING',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  invitedUser: null,
};

describe('mapRowSV — invitedUserName', () => {
  it('returns null when the row has no associated user', () => {
    expect(mapRowSV(ROW).invitedUserName).toBeNull();
  });

  it("returns the invitee's display name for an authenticated invitee", () => {
    expect(mapRowSV({ ...ROW, invitedUser: { name: 'Nicolás Pérez' } }).invitedUserName).toBe(
      'Nicolás Pérez',
    );
  });
});
