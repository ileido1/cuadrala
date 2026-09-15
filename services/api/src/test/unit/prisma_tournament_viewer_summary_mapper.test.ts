import { describe, expect, it } from 'vitest';

import { buildViewerTournamentItemsSV } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';
import type { TournamentListItemDTO } from '../../domain/ports/tournament_query_repository.js';

function tournamentSV(_id: string): TournamentListItemDTO {
  return {
    id: _id,
    name: `Torneo ${_id}`,
    status: 'OPEN',
    visibility: 'PUBLIC',
    organizerUserId: null,
    organizerName: null,
    sportId: 's1',
    sportName: 'Padel',
    categoryId: 'c1',
    categoryName: 'Masculino',
    startsAt: null,
    registrationCount: 0,
    venueId: null,
    venueName: null,
    inscriptionPrice: null,
    maxSlots: null,
    registrationClosesAt: null,
    gender: null,
  };
}

describe('buildViewerTournamentItemsSV — registered and invited', () => {
  it('returns both tournaments, each with its own registration status or invitation id', () => {
    const RESULT = buildViewerTournamentItemsSV({
      tournaments: [tournamentSV('a'), tournamentSV('b')],
      registrations: [{ tournamentId: 'a', status: 'CONFIRMED' }],
      invitations: [{ tournamentId: 'b', id: 'invitation-1' }],
      organizerTournamentIds: [],
      pendingRegistrationCounts: [],
    });

    const ITEM_A = RESULT.find((_i) => _i.tournament.id === 'a');
    const ITEM_B = RESULT.find((_i) => _i.tournament.id === 'b');

    expect(ITEM_A).toMatchObject({ registrationStatus: 'CONFIRMED', pendingInvitationId: null });
    expect(ITEM_B).toMatchObject({ registrationStatus: null, pendingInvitationId: 'invitation-1' });
  });
});

describe('buildViewerTournamentItemsSV — isOrganizer', () => {
  it('is true for a tournament the viewer organizes', () => {
    const RESULT = buildViewerTournamentItemsSV({
      tournaments: [tournamentSV('c')],
      registrations: [],
      invitations: [],
      organizerTournamentIds: ['c'],
      pendingRegistrationCounts: [],
    });

    expect(RESULT[0]?.isOrganizer).toBe(true);
  });

  it('is false for a tournament the viewer neither organizes, registers in, nor is invited to', () => {
    const RESULT = buildViewerTournamentItemsSV({
      tournaments: [tournamentSV('d')],
      registrations: [],
      invitations: [],
      organizerTournamentIds: [],
      pendingRegistrationCounts: [],
    });

    expect(RESULT[0]?.isOrganizer).toBe(false);
  });
});

describe('buildViewerTournamentItemsSV — pendingRegistrationsCount', () => {
  it('is set to the pending count only when the viewer organizes the tournament', () => {
    const RESULT = buildViewerTournamentItemsSV({
      tournaments: [tournamentSV('e')],
      registrations: [],
      invitations: [],
      organizerTournamentIds: ['e'],
      pendingRegistrationCounts: [{ tournamentId: 'e', count: 3 }],
    });

    expect(RESULT[0]?.pendingRegistrationsCount).toBe(3);
  });

  it('is null when the viewer does not organize the tournament, even if a count exists', () => {
    const RESULT = buildViewerTournamentItemsSV({
      tournaments: [tournamentSV('f')],
      registrations: [{ tournamentId: 'f', status: 'PENDING' }],
      invitations: [],
      organizerTournamentIds: [],
      pendingRegistrationCounts: [{ tournamentId: 'f', count: 5 }],
    });

    expect(RESULT[0]?.pendingRegistrationsCount).toBeNull();
  });
});
