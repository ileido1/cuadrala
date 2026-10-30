import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListTournamentChatMessagesUseCase } from '../../application/use_cases/list_tournament_chat_messages.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockChatThreadRepository = {
  getOrCreateForTournamentSV: vi.fn(),
};

const mockChatMessageRepository = {
  listByThreadIdSV: vi.fn(),
};

const useCase = new ListTournamentChatMessagesUseCase(
  mockTournamentRepository as never,
  mockChatThreadRepository as never,
  mockChatMessageRepository as never,
);

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  formatPresetId: 'preset-1',
  presetSchemaVersion: 1,
  formatParameters: null,
  status: 'OPEN',
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ListTournamentChatMessagesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', limit: 50 }),
    ).rejects.toMatchObject({ code: 'TORNEO_NO_ENCONTRADO', statusCode: 404 });

    expect(mockChatThreadRepository.getOrCreateForTournamentSV).not.toHaveBeenCalled();
    expect(mockChatMessageRepository.listByThreadIdSV).not.toHaveBeenCalled();
  });

  it('should list the messages of the tournament thread without a cursor', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockChatThreadRepository.getOrCreateForTournamentSV.mockResolvedValue({
      id: 'thread-1',
      matchId: null,
      tournamentId: 'tournament-1',
      createdAt: new Date(),
    });
    const CREATED_AT = new Date();
    mockChatMessageRepository.listByThreadIdSV.mockResolvedValue([
      {
        id: 'message-1',
        threadId: 'thread-1',
        senderUserId: 'user-1',
        senderDisplayName: 'User One',
        text: 'Hola equipo',
        createdAt: CREATED_AT,
      },
    ]);

    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', limit: 50 });

    expect(mockChatThreadRepository.getOrCreateForTournamentSV).toHaveBeenCalledWith('tournament-1');
    expect(mockChatMessageRepository.listByThreadIdSV).toHaveBeenCalledWith({
      threadId: 'thread-1',
      limit: 50,
      cursorCreatedAt: undefined,
    });
    expect(RESULT).toEqual({
      threadId: 'thread-1',
      messages: [
        {
          id: 'message-1',
          senderUserId: 'user-1',
          senderDisplayName: 'User One',
          text: 'Hola equipo',
          createdAt: CREATED_AT,
        },
      ],
    });
  });

  it('should forward the pagination cursor to the message repository', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockChatThreadRepository.getOrCreateForTournamentSV.mockResolvedValue({
      id: 'thread-1',
      matchId: null,
      tournamentId: 'tournament-1',
      createdAt: new Date(),
    });
    mockChatMessageRepository.listByThreadIdSV.mockResolvedValue([]);
    const CURSOR = new Date('2026-01-01T00:00:00.000Z');

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      limit: 20,
      cursorCreatedAt: CURSOR,
    });

    expect(mockChatMessageRepository.listByThreadIdSV).toHaveBeenCalledWith({
      threadId: 'thread-1',
      limit: 20,
      cursorCreatedAt: CURSOR,
    });
    expect(RESULT.messages).toEqual([]);
  });
});
