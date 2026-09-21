import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplyEloAfterMatchResultUseCase } from '../../application/use_cases/apply_elo_after_match_result.use_case.js';

const mockMatchResultReadRepository = {
  findByIdWithMatchSV: vi.fn(),
};

const mockUserRatingRepository = {
  getRatingsByUserIdsSV: vi.fn(),
  countHistoryByUserIdsSV: vi.fn(),
  upsertRatingsSV: vi.fn(),
  appendHistorySV: vi.fn(),
};

const mockRankingRepository = {
  recalculateByCategoryIdSV: vi.fn(),
};

const useCase = new ApplyEloAfterMatchResultUseCase(
  mockMatchResultReadRepository as never,
  mockUserRatingRepository as never,
  mockRankingRepository as never,
);

const INPUT = {
  resultId: 'result-uuid',
  kFactor: 32,
  initialRating: 1200,
  minRating: 100,
  maxRating: 3000,
  provisionalGames: 10,
  provisionalKMultiplier: 2,
};

const COMPETITIVE_RESULT = {
  resultId: 'result-uuid',
  matchId: 'match-uuid',
  categoryId: 'category-uuid',
  affectsElo: true,
  scores: [
    { userId: 'user-1', points: 21 },
    { userId: 'user-2', points: 18 },
    { userId: 'user-3', points: 15 },
    { userId: 'user-4', points: 12 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchResultReadRepository.findByIdWithMatchSV.mockResolvedValue(COMPETITIVE_RESULT);
  mockUserRatingRepository.getRatingsByUserIdsSV.mockResolvedValue([]);
  mockUserRatingRepository.countHistoryByUserIdsSV.mockResolvedValue({});
  mockUserRatingRepository.upsertRatingsSV.mockResolvedValue(undefined);
  mockUserRatingRepository.appendHistorySV.mockResolvedValue(undefined);
  mockRankingRepository.recalculateByCategoryIdSV.mockResolvedValue({
    categoryId: 'category-uuid',
    entriesUpdated: 4,
  });
});

describe('ApplyEloAfterMatchResultUseCase', () => {
  it('should recalculate the competitive category ranking after applying Elo', async () => {
    const RESULT = await useCase.executeSV(INPUT);

    expect(RESULT).toEqual({ updated: 4 });
    expect(mockUserRatingRepository.appendHistorySV).toHaveBeenCalledTimes(1);
    expect(mockRankingRepository.recalculateByCategoryIdSV).toHaveBeenCalledWith('category-uuid');
    expect(mockRankingRepository.recalculateByCategoryIdSV).toHaveBeenCalledTimes(1);
  });

  it('should not apply Elo or recalculate ranking for a casual result', async () => {
    mockMatchResultReadRepository.findByIdWithMatchSV.mockResolvedValue({
      ...COMPETITIVE_RESULT,
      affectsElo: false,
    });

    await expect(useCase.executeSV(INPUT)).resolves.toEqual({ updated: 0 });

    expect(mockUserRatingRepository.getRatingsByUserIdsSV).not.toHaveBeenCalled();
    expect(mockUserRatingRepository.countHistoryByUserIdsSV).not.toHaveBeenCalled();
    expect(mockUserRatingRepository.upsertRatingsSV).not.toHaveBeenCalled();
    expect(mockUserRatingRepository.appendHistorySV).not.toHaveBeenCalled();
    expect(mockRankingRepository.recalculateByCategoryIdSV).not.toHaveBeenCalled();
  });
});
