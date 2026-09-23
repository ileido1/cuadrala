import { describe, expect, it } from 'vitest';

import { MatchQuickMatchUseCase } from './match_quick_match.use_case.js';

const SEARCH = { id: 's', sportId: 'sport', categoryId: 'cat', targetDate: new Date(), slots: ['EVENING'] as ('MORNING' | 'AFTERNOON' | 'EVENING')[], widenLevel: false, zoneKm: 10, includeOpenMatches: true, status: 'SEARCHING' as const, noMatchYet: false, dismissedMatchIds: [], proposal: null };
const NOOP = { dismissProposalForUserSV: async () => { throw new Error('not used'); }, confirmProposalForUserSV: async () => { throw new Error('not used'); } };

describe('MatchQuickMatchUseCase', () => {
  it('proposes a compatible open match before a new player group', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => ({ matchId: 'm', participantIds: ['a', 'b', 'c'] }),
      createOpenProposalSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'p', type: 'OPEN_MATCH', status: 'PENDING', matchId: 'm', playerIds: ['a', 'b', 'c'], venueOptions: null, expiresAt: new Date() } }),
      findCompatibleGroupSV: async () => { throw new Error('should not group'); }, createGroupProposalsSV: async () => { throw new Error('should not group'); },
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect((await UC.executeSV(SEARCH)).status).toBe('PROPOSAL');
  });

  it('forms a group when no compatible open match exists', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => ({ searchIds: ['s', 's2', 's3', 's4'], userIds: ['u1', 'u2', 'u3', 'u4'] }),
      createGroupProposalsSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'group', type: 'NEW_GROUP', status: 'PENDING', matchId: null, playerIds: ['u1', 'u2', 'u3', 'u4'], venueOptions: null, expiresAt: new Date() } }),
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect((await UC.executeSV(SEARCH)).proposal?.type).toBe('NEW_GROUP');
  });
});
