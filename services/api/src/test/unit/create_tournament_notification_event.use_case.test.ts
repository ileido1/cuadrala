import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateTournamentNotificationEventUseCase } from '../../application/use_cases/create_tournament_notification_event.use_case.js';

const mockEventRepository = { createTournamentEventSV: vi.fn() };
const mockDeliveryRepository = { createManyIdempotentSV: vi.fn() };

const useCase = new CreateTournamentNotificationEventUseCase(
  mockEventRepository as never,
  mockDeliveryRepository as never,
);

const BASE = {
  type: 'TOURNAMENT_SCHEDULE_PUBLISHED',
  tournamentId: 'tournament-1',
  categoryId: 'category-1',
  payload: { tournamentName: 'Torneo Demo' },
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  mockEventRepository.createTournamentEventSV.mockResolvedValue({ id: 'event-1' });
  mockDeliveryRepository.createManyIdempotentSV.mockResolvedValue({ createdCount: 2 });
});

describe('CreateTournamentNotificationEventUseCase', () => {
  it('should create one delivery per recipient', async () => {
    const RESULT = await useCase.executeSV({ ...BASE, userIds: ['user-1', 'user-2'] });

    expect(RESULT.eventId).toBe('event-1');
    expect(RESULT.createdDeliveries).toBe(2);
    expect(mockDeliveryRepository.createManyIdempotentSV).toHaveBeenCalledWith([
      expect.objectContaining({ eventId: 'event-1', userId: 'user-1', status: 'PENDING' }),
      expect.objectContaining({ eventId: 'event-1', userId: 'user-2', status: 'PENDING' }),
    ]);
  });

  it('should send the event to the tournament, never to a match', async () => {
    await useCase.executeSV({ ...BASE, userIds: ['user-1'] });

    expect(mockEventRepository.createTournamentEventSV).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOURNAMENT_SCHEDULE_PUBLISHED',
        tournamentId: 'tournament-1',
      }),
    );
  });

  it('should not notify the same user twice when the roster repeats them', async () => {
    await useCase.executeSV({ ...BASE, userIds: ['user-1', 'user-1', 'user-2'] });

    const DELIVERIES = mockDeliveryRepository.createManyIdempotentSV.mock.calls[0]?.[0];
    expect(DELIVERIES).toHaveLength(2);
  });

  //? Un evento sin entregas nunca se procesa y queda para siempre en el
  //? backlog del despachador, que lo relee en cada tick.
  it('should not create an event when there is nobody to notify', async () => {
    const RESULT = await useCase.executeSV({ ...BASE, userIds: [] });

    expect(RESULT.eventId).toBeNull();
    expect(RESULT.createdDeliveries).toBe(0);
    expect(mockEventRepository.createTournamentEventSV).not.toHaveBeenCalled();
    expect(mockDeliveryRepository.createManyIdempotentSV).not.toHaveBeenCalled();
  });
});
