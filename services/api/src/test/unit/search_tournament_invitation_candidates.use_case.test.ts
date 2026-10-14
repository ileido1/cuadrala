import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchTournamentInvitationCandidatesUseCase } from '../../application/use_cases/search_tournament_invitation_candidates.use_case.js';

const tournamentRepository = { findByIdSV: vi.fn() };
const userRepository = { searchTournamentInvitationCandidatesSV: vi.fn() };
const access = { executeSV: vi.fn() };
let useCase: SearchTournamentInvitationCandidatesUseCase;

beforeEach(() => {
  vi.clearAllMocks();
  tournamentRepository.findByIdSV.mockResolvedValue({
    id: 'tournament-1', organizerUserId: 'organizer-1', venueId: 'venue-1',
  });
  userRepository.searchTournamentInvitationCandidatesSV.mockResolvedValue([
    { id: 'player-1', name: 'Ada Player' },
  ]);
  useCase = new SearchTournamentInvitationCandidatesUseCase(
    tournamentRepository as never,
    userRepository as never,
    access as never,
  );
});

describe('SearchTournamentInvitationCandidatesUseCase', () => {
  it('should authorize the organizer and return only eligible candidate fields', async () => {
    await expect(useCase.executeSV({
      tournamentId: 'tournament-1', actorUserId: 'organizer-1', query: '  ad  ',
    })).resolves.toEqual([{ id: 'player-1', name: 'Ada Player' }]);
    expect(access.executeSV).toHaveBeenCalledWith({
      actorUserId: 'organizer-1', organizerUserId: 'organizer-1', venueId: 'venue-1',
    });
    expect(userRepository.searchTournamentInvitationCandidatesSV).toHaveBeenCalledWith(
      'tournament-1', 'ad', 20,
    );
  });

  it('should reject queries shorter than two characters before searching', async () => {
    await expect(useCase.executeSV({
      tournamentId: 'tournament-1', actorUserId: 'organizer-1', query: ' a ',
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(userRepository.searchTournamentInvitationCandidatesSV).not.toHaveBeenCalled();
  });

  it('should reject missing tournaments', async () => {
    tournamentRepository.findByIdSV.mockResolvedValue(null);
    await expect(useCase.executeSV({
      tournamentId: 'tournament-1', actorUserId: 'organizer-1', query: 'Ada',
    })).rejects.toMatchObject({ statusCode: 404 });
  });
});
