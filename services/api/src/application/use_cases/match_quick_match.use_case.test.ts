import { describe, expect, it } from 'vitest';

import type { QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';
import { MatchQuickMatchUseCase } from './match_quick_match.use_case.js';

const SEARCH: QuickMatchSearchDTO = { id: 's', sportId: 'sport', categoryId: 'cat', targetDate: new Date(), slots: ['EVENING'], widenLevel: false, zoneKm: 10, includeOpenMatches: true, status: 'SEARCHING', noMatchYet: false, dismissedMatchIds: [], proposal: null, acceptedCount: 0 };
const NOOP = { dismissProposalForUserSV: async () => { throw new Error('not used'); }, confirmProposalForUserSV: async () => { throw new Error('not used'); } };
const FULL_GROUP_PROPOSAL: QuickMatchSearchDTO = { ...SEARCH, status: 'PROPOSAL', proposal: { id: 'group', type: 'NEW_GROUP', status: 'PENDING', matchId: null, playerIds: ['older', 'searcher', 'invitee-1', 'invitee-2'], venueOptions: null, expiresAt: new Date() } };

describe('MatchQuickMatchUseCase', () => {
  it('should propose a compatible open match before a new player group', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => ({ matchId: 'm', participantIds: ['a', 'b', 'c'] }),
      createOpenProposalSV: async () => ({ ...SEARCH, status: 'PROPOSAL', proposal: { id: 'p', type: 'OPEN_MATCH', status: 'PENDING', matchId: 'm', playerIds: ['a', 'b', 'c'], venueOptions: null, expiresAt: new Date() } }),
      findCompatibleGroupSV: async () => { throw new Error('should not group'); }, createGroupProposalsSV: async () => { throw new Error('should not group'); },
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect((await UC.executeSV(SEARCH)).status).toBe('PROPOSAL');
  });

  //? S1: con menos de 4 jugadores no hay grupo; la búsqueda sigue en cola.
  it('should keep searching when no full group of four is available', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => null,
      createGroupProposalsSV: async () => { throw new Error('must not create a partial group'); },
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect(await UC.executeSV(SEARCH)).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null });
  });

  it('should open a ready check for a full group of four when no open match exists', async () => {
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => ({ searchIds: ['o', 's'], userIds: ['older', 'searcher', 'invitee-1', 'invitee-2'], invitationUserIds: ['invitee-1', 'invitee-2'] }),
      createGroupProposalsSV: async () => FULL_GROUP_PROPOSAL,
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    });
    expect((await UC.executeSV(SEARCH, 'searcher')).proposal).toMatchObject({ type: 'NEW_GROUP', status: 'PENDING' });
  });

  it('should not rematch a member who already accepted a ready check', async () => {
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

  //? S2: antes solo se avisaba a los invitados; los buscadores en cola no se enteraban.
  it('should notify every group member except the searcher who triggered the match', async () => {
    const notified: string[][] = [];
    const UC = new MatchQuickMatchUseCase({
      startForUserSV: async () => SEARCH, findByUserIdSV: async () => SEARCH, cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null, createOpenProposalSV: async () => null,
      findCompatibleGroupSV: async () => ({ searchIds: ['o', 's'], userIds: ['older', 'searcher', 'invitee-1', 'invitee-2'], invitationUserIds: ['invitee-1', 'invitee-2'] }),
      createGroupProposalsSV: async () => FULL_GROUP_PROPOSAL,
      markNoMatchYetSV: async () => ({ ...SEARCH, noMatchYet: true }), ...NOOP,
    }, { executeSV: async (_dto: { userIds: string[] }) => { notified.push(_dto.userIds); } } as never);

    await UC.executeSV(SEARCH, 'searcher');
    expect(notified).toEqual([['older', 'invitee-1', 'invitee-2']]);
  });
});
