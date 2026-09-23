import { describe, expect, it } from 'vitest';

import { MatchQuickMatchUseCase } from './match_quick_match.use_case.js';

const SEARCH = { id: 's', sportId: 'sport', categoryId: 'cat', targetDate: new Date(), slots: ['EVENING'] as ('MORNING' | 'AFTERNOON' | 'EVENING')[], widenLevel: false, zoneKm: 10, includeOpenMatches: true, status: 'SEARCHING' as const, noMatchYet: false, dismissedMatchIds: [], proposal: null };

describe('MatchQuickMatchUseCase', () => {
  it('proposes a compatible open match before declaring no immediate match', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH,
      findByUserIdSV: async () => SEARCH,
      cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => ({ matchId: 'm', participantIds: ['a', 'b', 'c'] }),
      createOpenProposalSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'p', type: 'OPEN_MATCH', status: 'PENDING', matchId: 'm', playerIds: ['a', 'b', 'c'], venueOptions: null, expiresAt: new Date() } }),
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true, dismissedMatchIds: [] }),
    });
    expect((await UC.executeSV(SEARCH)).status).toBe('PROPOSAL');
  });
});
