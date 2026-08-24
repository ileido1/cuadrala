import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateParametrizedTournamentUseCase } from '../../application/use_cases/create_parametrized_tournament.use_case.js';

const mockCategoryRepository = {
  findByIdSV: vi.fn(),
};

const mockSportRepository = {
  findByIdSV: vi.fn(),
};

const mockFormatPresetRepository = {
  findByIdSV: vi.fn(),
  findActiveBySportAndCodeSV: vi.fn(),
};

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const mockValidator = {
  validateAndNormalizeSV: vi.fn((_input: unknown) => undefined),
};

const useCase = new CreateParametrizedTournamentUseCase(
  mockCategoryRepository as never,
  mockSportRepository as never,
  mockFormatPresetRepository as never,
  mockTournamentRepository as never,
  mockValidator as never,
);

const CATEGORY = { id: 'category-1', name: 'Categoría', sportId: 'sport-1' };
const SPORT = { id: 'sport-1', name: 'Pádel' };
const PRESET = {
  id: 'preset-1',
  code: 'ROUND_ROBIN',
  name: 'Todos contra todos',
  sportId: 'sport-1',
  schemaVersion: 1,
};
const CREATED = {
  id: 'tournament-1',
  sportId: 'sport-1',
  formatPresetId: 'preset-1',
  presetSchemaVersion: 1,
  status: 'DRAFT',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCategoryRepository.findByIdSV.mockResolvedValue(CATEGORY);
  mockSportRepository.findByIdSV.mockResolvedValue(SPORT);
  mockFormatPresetRepository.findByIdSV.mockResolvedValue(PRESET);
  mockTournamentRepository.createTournamentSV.mockResolvedValue(CREATED);
});

describe('CreateParametrizedTournamentUseCase', () => {
  it('should propagate the authenticated organizerUserId to the repository', async () => {
    await useCase.executeSV({
      name: 'Torneo de Otoño',
      categoryId: 'category-1',
      sportId: 'sport-1',
      formatPresetId: 'preset-1',
      organizerUserId: 'user-42',
      visibility: 'PRIVATE',
    });

    expect(mockTournamentRepository.createTournamentSV).toHaveBeenCalledWith(
      expect.objectContaining({ organizerUserId: 'user-42', visibility: 'PRIVATE' }),
    );
  });

  it('should omit visibility and organizerUserId when not provided', async () => {
    await useCase.executeSV({
      name: 'Torneo de Otoño',
      categoryId: 'category-1',
      sportId: 'sport-1',
      formatPresetId: 'preset-1',
    });

    const CALL_ARGS = mockTournamentRepository.createTournamentSV.mock.calls[0]![0];
    expect(CALL_ARGS).not.toHaveProperty('organizerUserId');
    expect(CALL_ARGS).not.toHaveProperty('visibility');
  });
});
