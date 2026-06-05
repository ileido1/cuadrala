import { describe, expect, it, vi } from 'vitest';

import { GetProfileUseCase } from '../../application/use_cases/get_profile.use_case.js';

const BASE_USER = {
  id: 'user-1',
  email: 'jugador@test.local',
  name: 'Carlos Pérez',
  subscriptionType: 'FREE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
};

describe('GetProfileUseCase', () => {
  it('should include primaryRating (categoría + ELO) when the player has ratings', async () => {
    const UC = new GetProfileUseCase(
      { findByIdSV: vi.fn().mockResolvedValue(BASE_USER) },
      {
        getUserRatingsSV: vi.fn(),
        getUserRatingHistorySV: vi.fn(),
        getPrimaryUserRatingSV: vi.fn().mockResolvedValue({
          categoryId: 'cat-1',
          categoryName: 'Primera',
          sportId: 'sport-1',
          rating: 1620.4,
        }),
      },
    );

    const RESULT = await UC.executeSV('user-1');

    expect(RESULT.primaryRating).toEqual({
      categoryId: 'cat-1',
      categoryName: 'Primera',
      sportId: 'sport-1',
      rating: 1620.4,
    });
  });

  it('should degrade primaryRating to null when the player has no ratings', async () => {
    const UC = new GetProfileUseCase(
      { findByIdSV: vi.fn().mockResolvedValue(BASE_USER) },
      {
        getUserRatingsSV: vi.fn(),
        getUserRatingHistorySV: vi.fn(),
        getPrimaryUserRatingSV: vi.fn().mockResolvedValue(null),
      },
    );

    const RESULT = await UC.executeSV('user-1');

    expect(RESULT.primaryRating).toBeNull();
  });

  it('should throw USUARIO_NO_ENCONTRADO when the user does not exist', async () => {
    const UC = new GetProfileUseCase(
      { findByIdSV: vi.fn().mockResolvedValue(null) },
      {
        getUserRatingsSV: vi.fn(),
        getUserRatingHistorySV: vi.fn(),
        getPrimaryUserRatingSV: vi.fn(),
      },
    );

    await expect(UC.executeSV('missing')).rejects.toMatchObject({
      code: 'USUARIO_NO_ENCONTRADO',
      statusCode: 404,
    });
  });
});
