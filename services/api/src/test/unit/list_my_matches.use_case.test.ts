import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListMyMatchesUseCase } from '../../application/use_cases/list_my_matches.use_case.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';

const FAKE_ITEM = {
  id: 'match-uuid-1',
  sportId: 'sport-uuid',
  categoryId: 'cat-uuid',
  categoryName: 'Padel 4ta',
  type: 'REGULAR' as const,
  status: 'SCHEDULED' as const,
  scheduledAt: new Date('2026-06-01T19:00:00.000Z'),
  pricePerPlayerCents: 250000,
  maxParticipants: 4,
  participantCount: 3,
  openSpots: 1,
};

const mockRepository: MatchQueryRepository = {
  listMatchesSV: vi.fn(),
  getMatchByIdSV: vi.fn(),
  listMatchesByVenueSV: vi.fn(),
  listMyMatchesSV: vi.fn(),
};

const useCase = new ListMyMatchesUseCase(mockRepository);

describe('ListMyMatchesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns paginated items when called with valid params', async () => {
    vi.mocked(mockRepository.listMyMatchesSV).mockResolvedValue({
      items: [FAKE_ITEM],
      total: 1,
    });

    const RESULT = await useCase.executeSV({
      userId: 'user-uuid',
      page: 1,
      limit: 20,
    });

    expect(RESULT.items).toHaveLength(1);
    expect(RESULT.pageInfo.page).toBe(1);
    expect(RESULT.pageInfo.limit).toBe(20);
    expect(RESULT.pageInfo.total).toBe(1);
    expect(mockRepository.listMyMatchesSV).toHaveBeenCalledWith(
      'user-uuid',
      {},
      { page: 1, limit: 20 },
    );
  });

  it('throws PAGINACION_INVALIDA when page < 1', async () => {
    await expect(
      useCase.executeSV({ userId: 'user-uuid', page: 0, limit: 20 }),
    ).rejects.toThrow('page debe ser mayor o igual a 1.');
  });

  it('throws PAGINACION_INVALIDA when limit < 1', async () => {
    await expect(
      useCase.executeSV({ userId: 'user-uuid', page: 1, limit: 0 }),
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('throws PAGINACION_INVALIDA when limit > 100', async () => {
    await expect(
      useCase.executeSV({ userId: 'user-uuid', page: 1, limit: 101 }),
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('passes statuses filter to repository', async () => {
    vi.mocked(mockRepository.listMyMatchesSV).mockResolvedValue({ items: [], total: 0 });

    await useCase.executeSV({
      userId: 'user-uuid',
      page: 1,
      limit: 20,
      statuses: ['SCHEDULED', 'IN_PROGRESS'],
    });

    expect(mockRepository.listMyMatchesSV).toHaveBeenCalledWith(
      'user-uuid',
      { statuses: ['SCHEDULED', 'IN_PROGRESS'] },
      { page: 1, limit: 20 },
    );
  });

  it('passes role filter to repository', async () => {
    vi.mocked(mockRepository.listMyMatchesSV).mockResolvedValue({ items: [], total: 0 });

    await useCase.executeSV({
      userId: 'user-uuid',
      page: 1,
      limit: 20,
      role: 'CREATOR',
    });

    expect(mockRepository.listMyMatchesSV).toHaveBeenCalledWith(
      'user-uuid',
      { role: 'CREATOR' },
      { page: 1, limit: 20 },
    );
  });

  it('passes scheduledFrom and scheduledTo to repository', async () => {
    vi.mocked(mockRepository.listMyMatchesSV).mockResolvedValue({ items: [], total: 0 });

    const FROM = new Date('2026-05-01T00:00:00.000Z');
    const TO = new Date('2026-06-01T00:00:00.000Z');

    await useCase.executeSV({
      userId: 'user-uuid',
      page: 1,
      limit: 20,
      scheduledFrom: FROM,
      scheduledTo: TO,
    });

    expect(mockRepository.listMyMatchesSV).toHaveBeenCalledWith(
      'user-uuid',
      { scheduledFrom: FROM, scheduledTo: TO },
      { page: 1, limit: 20 },
    );
  });

  it('returns empty list when user has no matches', async () => {
    vi.mocked(mockRepository.listMyMatchesSV).mockResolvedValue({ items: [], total: 0 });

    const RESULT = await useCase.executeSV({ userId: 'user-uuid', page: 1, limit: 20 });

    expect(RESULT.items).toHaveLength(0);
    expect(RESULT.pageInfo.total).toBe(0);
  });
});
