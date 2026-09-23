import { describe, expect, it } from 'vitest';

import type { QuickMatchSearchDTO } from '../../domain/ports/quick_match_repository.js';
import { ConfirmMyQuickMatchProposalUseCase } from './confirm_my_quick_match_proposal.use_case.js';

const SEARCH: QuickMatchSearchDTO = {
  id: 'search', sportId: 'sport', categoryId: 'category', targetDate: new Date(), slots: ['EVENING'] as ('MORNING' | 'AFTERNOON' | 'EVENING')[],
  widenLevel: false, zoneKm: 10, includeOpenMatches: true, status: 'PROPOSAL' as const, noMatchYet: false,
  dismissedMatchIds: [], proposal: { id: 'proposal', type: 'OPEN_MATCH' as const, status: 'PENDING' as const, matchId: 'match', playerIds: [], venueOptions: null, expiresAt: new Date(Date.now() + 60_000) },
};

describe('ConfirmMyQuickMatchProposalUseCase', () => {
  it('joins the proposed open match before marking the proposal confirmed', async () => {
    const calls: string[] = [];
    const uc = new ConfirmMyQuickMatchProposalUseCase({
      startForUserSV: async () => SEARCH,
      findByUserIdSV: async () => SEARCH,
      cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null,
      createOpenProposalSV: async () => SEARCH,
      markNoMatchYetSV: async () => SEARCH,
      dismissProposalForUserSV: async () => SEARCH,
      confirmProposalForUserSV: async () => { calls.push('confirm'); return { ...SEARCH, status: 'CONFIRMED' }; },
      findCompatibleGroupSV: async () => null,
      createGroupProposalsSV: async () => null,
    }, { executeSV: async (_matchId: string, _userId: string) => { calls.push(`join:${_matchId}:${_userId}`); return { matchId: _matchId, userId: _userId }; } } as never);

    await uc.executeSV('player');
    expect(calls).toEqual(['join:match:player', 'confirm']);
  });
});
