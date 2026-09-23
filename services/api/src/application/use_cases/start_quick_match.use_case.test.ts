import { describe, expect, it } from 'vitest';

import { StartQuickMatchUseCase } from './start_quick_match.use_case.js';

describe('StartQuickMatchUseCase', () => {
  it('persists the player category with a queued search', async () => {
    const CALLS: unknown[] = [];
    const UC = new StartQuickMatchUseCase({
      startForUserSV: async (_userId, _input) => {
        CALLS.push(_input);
        return { id: 'search', ..._input, status: 'SEARCHING', noMatchYet: false, dismissedMatchIds: [], proposal: null };
      },
      findByUserIdSV: async () => null,
      cancelForUserSV: async () => undefined,
      findOpenCandidateSV: async () => null,
      createOpenProposalSV: async () => { throw new Error('not used'); },
      markNoMatchYetSV: async () => { throw new Error('not used'); },
      dismissProposalForUserSV: async () => { throw new Error('not used'); },
      confirmProposalForUserSV: async () => { throw new Error('not used'); },
      findCompatibleGroupSV: async () => null,
      createGroupProposalsSV: async () => null,
    });

    await UC.executeSV('user', {
      sportId: 'sport',
      categoryId: 'category',
      day: 'TOMORROW',
      slots: ['EVENING'],
      widenLevel: false,
      zoneKm: 10,
      includeOpenMatches: true,
    });

    expect(CALLS[0]).toMatchObject({ categoryId: 'category', slots: ['EVENING'] });
  });
});
