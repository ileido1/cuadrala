import { describe, expect, it, vi } from 'vitest';

import { ListMyTournamentsUseCase } from '../../application/use_cases/list_my_tournaments.use_case.js';

const mockRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
  listViewerTournamentsSV: vi.fn(),
};

const useCase = new ListMyTournamentsUseCase(mockRepository);

describe('ListMyTournamentsUseCase', () => {
  it("returns the viewer's tournaments from the query repository", async () => {
    const ITEMS = [
      {
        tournament: { id: 'a' },
        registrationStatus: 'CONFIRMED',
        pendingInvitationId: null,
        isOrganizer: false,
        pendingRegistrationsCount: null,
      },
    ];
    mockRepository.listViewerTournamentsSV.mockResolvedValue(ITEMS);

    const RESULT = await useCase.executeSV({ actorUserId: 'user-1' });

    expect(mockRepository.listViewerTournamentsSV).toHaveBeenCalledWith('user-1');
    expect(RESULT).toEqual({ items: ITEMS });
  });
});
