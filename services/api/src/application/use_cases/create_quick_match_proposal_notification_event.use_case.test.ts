import { describe, expect, it } from 'vitest';

import { CreateQuickMatchProposalNotificationEventUseCase } from './create_quick_match_proposal_notification_event.use_case.js';

describe('CreateQuickMatchProposalNotificationEventUseCase', () => {
  it('should not create an event when every queued player disabled quick match alerts', async () => {
    let created = false;
    const uc = new CreateQuickMatchProposalNotificationEventUseCase(
      { createQuickMatchProposalSV: async () => { created = true; throw new Error('not expected'); } } as never,
      { createManyIdempotentSV: async () => { throw new Error('not expected'); } } as never,
      { filterEnabledUserIdsForEventSV: async () => [] } as never,
    );

    await uc.executeSV({ quickMatchSearchId: 'search', categoryId: 'category', userIds: ['player'], proposalType: 'OPEN_MATCH' });
    expect(created).toBe(false);
  });

  it('should create one direct delivery for each opted-in player', async () => {
    const deliveries: unknown[] = [];
    const uc = new CreateQuickMatchProposalNotificationEventUseCase(
      { createQuickMatchProposalSV: async () => ({ id: 'event' }) } as never,
      { createManyIdempotentSV: async (items: unknown[]) => { deliveries.push(...items); return { createdCount: items.length }; } } as never,
      { filterEnabledUserIdsForEventSV: async () => ['one', 'two'] } as never,
    );

    await uc.executeSV({ quickMatchSearchId: 'search', categoryId: 'category', userIds: ['one', 'two'], proposalType: 'NEW_GROUP' });
    expect(deliveries).toHaveLength(2);
  });
});
