import { describe, expect, it, vi } from 'vitest';

import { RespondTournamentInvitationUseCase } from '../../application/use_cases/respond_tournament_invitation.use_case.js';
import type { TournamentInvitationDTO, TournamentInvitationRepository } from '../../domain/ports/tournament_invitation_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

describe('RespondTournamentInvitationUseCase', () => {
  it('keeps an accepted invitee pending until the organizer confirms the registration', async () => {
    const INVITATION = {
      id: 'invitation-1',
      tournamentId: 'tournament-1',
      invitedUserId: 'player-1',
      status: 'PENDING',
    } as TournamentInvitationDTO;
    const UPSERT_REGISTRATION = vi.fn();
    const UPDATE_INVITATION = vi.fn(async () => ({ ...INVITATION, status: 'ACCEPTED' }));
    const INVITATION_REPOSITORY = {
      findByIdSV: vi.fn(async () => INVITATION),
      updateStatusSV: UPDATE_INVITATION,
    } as unknown as TournamentInvitationRepository;
    const REGISTRATION_REPOSITORY = {
      upsertSV: UPSERT_REGISTRATION,
    } as unknown as TournamentRegistrationRepository;
    const TOURNAMENT_REPOSITORY = {
      findByIdSV: vi.fn(async () => ({ status: 'OPEN' })),
    } as unknown as TournamentRepository;

    const RESULT = await new RespondTournamentInvitationUseCase(
      TOURNAMENT_REPOSITORY,
      INVITATION_REPOSITORY,
      REGISTRATION_REPOSITORY,
    ).executeSV({
      invitationId: INVITATION.id,
      actorUserId: INVITATION.invitedUserId,
      action: 'ACCEPT',
    });

    expect(UPSERT_REGISTRATION).toHaveBeenCalledWith({
      tournamentId: INVITATION.tournamentId,
      userId: INVITATION.invitedUserId,
      status: 'PENDING',
    });
    expect(UPDATE_INVITATION).toHaveBeenCalledWith(INVITATION.id, 'ACCEPTED');
    expect(RESULT.status).toBe('ACCEPTED');
  });
});
