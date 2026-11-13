import { describe, expect, it } from 'vitest';

import { UpdateMatchStatusUseCase } from '../../application/use_cases/update_match_status.use_case.js';
import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';

function fakeRepositorySV(_overrides: Partial<MatchStatusRepository> = {}): MatchStatusRepository {
  return {
    updateScheduledToInProgressSV: async () => ({ updatedCount: 0, cancelledCount: 0, cancelled: [] }),
    finishExpiredInProgressSV: async () => [],
    transitionStatusIfCurrentSV: async () => true,
    ..._overrides,
  };
}

describe('UpdateMatchStatusUseCase', () => {
  it('should notify every participant with the reason when the worker cancels a match', async () => {
    const CANCEL_CALLS: unknown[] = [];
    const UC = new UpdateMatchStatusUseCase(
      fakeRepositorySV({
        updateScheduledToInProgressSV: async () => ({
          updatedCount: 0,
          cancelledCount: 1,
          cancelled: [{ matchId: 'm1', categoryId: 'c1', reason: 'UNPAID', participantUserIds: ['a', 'b'] }],
        }),
      }),
      {
        matchCancelled: { executeSV: async (_dto: unknown) => { CANCEL_CALLS.push(_dto); return { eventId: 'e', createdDeliveries: 2 }; } },
        resultReminder: { executeSV: async () => { throw new Error('no debería llamarse'); } },
      } as never,
    );

    const RESULT = await UC.execute();

    expect(RESULT.cancelledCount).toBe(1);
    expect(CANCEL_CALLS).toEqual([
      {
        matchId: 'm1',
        categoryId: 'c1',
        userIds: ['a', 'b'],
        payload: { kind: 'MATCH_CANCELLED', matchId: 'm1', cancelledByUserId: null, reason: 'UNPAID' },
      },
    ]);
  });

  it('should remind only matches finished at block end without a result draft', async () => {
    const REMINDER_CALLS: unknown[] = [];
    const UC = new UpdateMatchStatusUseCase(
      fakeRepositorySV({
        finishExpiredInProgressSV: async () => [
          { matchId: 'm1', categoryId: 'c1', participantUserIds: ['a', 'b'], hasResultDraft: false },
          { matchId: 'm2', categoryId: 'c1', participantUserIds: ['c'], hasResultDraft: true },
        ],
      }),
      {
        matchCancelled: { executeSV: async () => ({ eventId: 'e', createdDeliveries: 0 }) },
        resultReminder: { executeSV: async (_dto: unknown) => { REMINDER_CALLS.push(_dto); } },
      } as never,
    );

    const RESULT = await UC.execute();

    expect(RESULT.finishedCount).toBe(2);
    expect(RESULT.remindedCount).toBe(1);
    expect(REMINDER_CALLS).toEqual([{ matchId: 'm1', categoryId: 'c1', userIds: ['a', 'b'] }]);
  });

  it('should keep transitioning when a notification fails', async () => {
    const UC = new UpdateMatchStatusUseCase(
      fakeRepositorySV({
        updateScheduledToInProgressSV: async () => ({
          updatedCount: 2,
          cancelledCount: 1,
          cancelled: [{ matchId: 'm1', categoryId: 'c1', reason: 'INCOMPLETE', participantUserIds: ['a'] }],
        }),
        finishExpiredInProgressSV: async () => [
          { matchId: 'm2', categoryId: 'c1', participantUserIds: ['a'], hasResultDraft: false },
        ],
      }),
      {
        matchCancelled: { executeSV: async () => { throw new Error('boom'); } },
        resultReminder: { executeSV: async () => { throw new Error('boom'); } },
      } as never,
    );

    const RESULT = await UC.execute();

    expect(RESULT).toEqual({
      updatedCount: 2,
      cancelledCount: 1,
      finishedCount: 1,
      remindedCount: 0,
      notificationFailures: 2,
    });
  });

  it('should still transition without notifiers when none are wired', async () => {
    const UC = new UpdateMatchStatusUseCase(
      fakeRepositorySV({
        updateScheduledToInProgressSV: async () => ({
          updatedCount: 1,
          cancelledCount: 1,
          cancelled: [{ matchId: 'm1', categoryId: 'c1', reason: 'INCOMPLETE', participantUserIds: ['a'] }],
        }),
      }),
    );

    const RESULT = await UC.execute();

    expect(RESULT.updatedCount).toBe(1);
    expect(RESULT.cancelledCount).toBe(1);
  });
});
