import { describe, expect, it, vi } from 'vitest';

import { UpdatePlayerProfileUseCase } from '../../application/use_cases/update_player_profile.use_case.js';
import { AppError } from '../../domain/errors/app_error.js';

describe('UpdatePlayerProfileUseCase', () => {
  it('should reject documentNumber already used by another user', async () => {
    const UC = new UpdatePlayerProfileUseCase(
      { upsertByUserIdSV: vi.fn() },
      {
        findByDocumentNumberSV: vi.fn().mockResolvedValue([
          { id: 'other-user', name: 'Otro', email: 'o@test.local', documentNumber: '12345678' },
        ]),
      },
    );

    await expect(
      UC.executeSV('user-a', { documentNumber: '12345678' }),
    ).rejects.toMatchObject({
      code: 'DOCUMENTO_EN_USO',
      statusCode: 409,
    });
  });

  it('should allow documentNumber when it belongs to the same user', async () => {
    const UPSERT = vi.fn().mockResolvedValue({
      userId: 'user-a',
      dominantHand: 'RIGHT',
      sidePreference: 'ANY',
      birthYear: null,
      birthDate: null,
      phone: null,
      documentNumber: '12345678',
      avatarUrl: null,
      city: null,
      onboardingCompletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const UC = new UpdatePlayerProfileUseCase(
      { upsertByUserIdSV: UPSERT },
      {
        findByDocumentNumberSV: vi.fn().mockResolvedValue([
          { id: 'user-a', name: 'Yo', email: 'yo@test.local', documentNumber: '12345678' },
        ]),
      },
    );

    await UC.executeSV('user-a', { documentNumber: '12345678' });
    expect(UPSERT).toHaveBeenCalledOnce();
  });

  it('should map Prisma P2002 on documentNumber to DOCUMENTO_EN_USO', async () => {
    const PRISMA_ERROR = Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['documentNumber'] },
    });
    const UC = new UpdatePlayerProfileUseCase(
      {
        upsertByUserIdSV: vi.fn().mockRejectedValue(PRISMA_ERROR),
      },
      { findByDocumentNumberSV: vi.fn().mockResolvedValue([]) },
    );

    await expect(UC.executeSV('user-a', { dominantHand: 'LEFT' })).rejects.toBeInstanceOf(
      AppError,
    );
    await expect(UC.executeSV('user-a', { dominantHand: 'LEFT' })).rejects.toMatchObject({
      code: 'DOCUMENTO_EN_USO',
    });
  });
});
