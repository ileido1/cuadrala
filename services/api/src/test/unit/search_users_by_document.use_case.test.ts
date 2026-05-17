import { describe, expect, it, vi } from 'vitest';

import { SearchUsersByDocumentUseCase } from '../../application/use_cases/search_users_by_document.use_case.js';

const mockUserRepository = {
  findByIdSV: vi.fn(),
  findByEmailSV: vi.fn(),
  createUserSV: vi.fn(),
  updateUserNameSV: vi.fn(),
  countByIdsSV: vi.fn(),
  findByDocumentNumberSV: vi.fn(),
};

const useCase = new SearchUsersByDocumentUseCase(mockUserRepository);

describe('SearchUsersByDocumentUseCase', () => {
  it('should return users from repository when document matches', async () => {
    const ITEMS = [
      {
        id: 'user-1',
        name: 'Juan',
        email: 'juan@test.com',
        documentNumber: '12345678',
      },
    ];
    mockUserRepository.findByDocumentNumberSV.mockResolvedValue(ITEMS);

    const RESULT = await useCase.executeSV('12345678');

    expect(RESULT).toEqual(ITEMS);
    expect(mockUserRepository.findByDocumentNumberSV).toHaveBeenCalledWith('12345678');
  });

  it('should return empty list when no users match document', async () => {
    mockUserRepository.findByDocumentNumberSV.mockResolvedValue([]);

    const RESULT = await useCase.executeSV('99999999');

    expect(RESULT).toEqual([]);
  });
});
