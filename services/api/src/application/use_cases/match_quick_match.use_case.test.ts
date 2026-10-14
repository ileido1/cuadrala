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

  it('starts an incremental group when no compatible open match exists', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => ({ searchIds: ['s'], userIds: ['u1'], invitationUserIds: [] }),
      createGroupProposalsSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'group', type: 'NEW_GROUP', status: 'PENDING', matchId: null, playerIds: ['u1'], venueOptions: null, expiresAt: new Date() } }),
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect((await UC.executeSV(SEARCH)).proposal?.type).toBe('NEW_GROUP');
  });

  it('does not rematch a confirmed incremental group member', async () => {
    const CONFIRMED = { ...SEARCH, status: 'CONFIRMED' as const };
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => { throw new Error('must not search open matches'); },
      createOpenProposalSV: async () => { throw new Error('must not create proposals'); },
      findCompatibleGroupSV: async () => { throw new Error('must not select another group'); },
      createGroupProposalsSV: async () => { throw new Error('must not create another group'); },
      markNoMatchYetSV: async () => { throw new Error('must preserve membership'); }, ...NOOP,
    });

    await expect(UC.executeSV(CONFIRMED)).resolves.toBe(CONFIRMED);
  });

  it('notifies only pending availability invitees, not already-confirmed searchers', async () => {
    const notified: string[][] = [];
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => ({ searchIds: ['s'], userIds: ['searcher', 'invitee'], invitationUserIds: ['invitee'] }),
      createGroupProposalsSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'group', type: 'NEW_GROUP', status: 'PENDING', matchId: null, playerIds: ['searcher', 'invitee'], venueOptions: null, expiresAt: new Date() } }),
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    }, { executeSV: async (_dto: { userIds: string[] }) => { notified.push(_dto.userIds); } } as never);

    await UC.executeSV(SEARCH, 'searcher');
    expect(notified).toEqual([['invitee']]);
  });
});
