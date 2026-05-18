import { describe, expect, it, vi } from 'vitest';

import { CreateAmericanoUseCase } from '../../application/use_cases/create_americano.use_case.js';
import { AppError } from '../../domain/errors/app_error.js';

const mockCategoryRepository = { findByIdSV: vi.fn(), findAllSV: vi.fn() };
const mockCourtRepository = { findById: vi.fn() };
const mockUserRepository = {
  findByIdSV: vi.fn(),
  findByEmailSV: vi.fn(),
  createUserSV: vi.fn(),
  updateUserNameSV: vi.fn(),
  countByIdsSV: vi.fn(),
};
const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};
const mockSportRepository = {
  listSportsSV: vi.fn(),
  findByIdSV: vi.fn(),
  findByCodeSV: vi.fn(),
};
const mockFormatPresetRepository = {
  listActiveFormatPresetsBySportIdSV: vi.fn(),
  findByIdSV: vi.fn(),
  findActiveBySportAndCodeSV: vi.fn(),
  publishNewVersionSV: vi.fn(),
};
const mockAmericanoMatchWriteRepository = { createAmericanoMatchSV: vi.fn() };

const useCase = new CreateAmericanoUseCase(
  mockCategoryRepository,
  mockCourtRepository,
  mockUserRepository,
  mockTournamentRepository,
  mockSportRepository,
  mockFormatPresetRepository,
  mockAmericanoMatchWriteRepository,
);

describe('CreateAmericanoUseCase', () => {
  it('should throw CATEGORIA_NO_ENCONTRADA when category does not exist', async () => {
    mockCategoryRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        categoryId: 'cat-missing',
        participantUserIds: ['u1', 'u2'],
      }),
    ).rejects.toMatchObject({
      code: 'CATEGORIA_NO_ENCONTRADA',
    } satisfies Partial<AppError>);
  });

  it('should throw PARTICIPANTES_DUPLICADOS when participant ids repeat', async () => {
    mockCategoryRepository.findByIdSV.mockResolvedValue({
      sportId: 'sport-1',
      scheme: 'RACKET_ORDINAL',
      skillBand: 'INTERMEDIATE',
      sortOrder: 4,
      id: 'cat-1',
      name: 'Open',
      slug: 'open',
    });

    await expect(
      useCase.executeSV({
        categoryId: 'cat-1',
        participantUserIds: ['u1', 'u1'],
      }),
    ).rejects.toMatchObject({
      code: 'PARTICIPANTES_DUPLICADOS',
    } satisfies Partial<AppError>);
  });

  it('should create americano with PADEL default when sport is omitted', async () => {
    mockCategoryRepository.findByIdSV.mockResolvedValue({
      sportId: 'sport-1',
      scheme: 'RACKET_ORDINAL',
      skillBand: 'INTERMEDIATE',
      sortOrder: 4,
      id: 'cat-1',
      name: 'Open',
      slug: 'open',
    });
    mockUserRepository.countByIdsSV.mockResolvedValue(2);
    mockSportRepository.findByCodeSV.mockResolvedValue({
      id: 'sport-padel',
      code: 'PADEL',
      name: 'Padel',
    });
    mockFormatPresetRepository.findActiveBySportAndCodeSV.mockResolvedValue({
      id: 'preset-americano',
      sportId: 'sport-padel',
      code: 'AMERICANO',
      version: 1,
      name: 'Americano',
      schemaVersion: 1,
      defaultParameters: {},
    });
    mockAmericanoMatchWriteRepository.createAmericanoMatchSV.mockResolvedValue({
      id: 'match-1',
      status: 'SCHEDULED',
      type: 'AMERICANO',
      sportId: 'sport-padel',
      formatPresetId: 'preset-americano',
      participantCount: 2,
    });

    const RESULT = await useCase.executeSV({
      categoryId: 'cat-1',
      participantUserIds: ['u1', 'u2'],
    });

    expect(RESULT).toMatchObject({
      matchId: 'match-1',
      status: 'SCHEDULED',
      type: 'AMERICANO',
      sportId: 'sport-padel',
      formatPresetId: 'preset-americano',
      participantCount: 2,
    });
    expect(mockAmericanoMatchWriteRepository.createAmericanoMatchSV).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat-1',
        sportId: 'sport-padel',
        formatPresetId: 'preset-americano',
        participantUserIds: ['u1', 'u2'],
      }),
    );
  });
});
