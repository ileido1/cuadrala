import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PostTournamentChatMessageUseCase } from '../../application/use_cases/post_tournament_chat_message.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockChatThreadRepository = {
  getOrCreateForTournamentSV: vi.fn(),
};

const mockChatMessageRepository = {
  createSV: vi.fn(),
};

const useCase = new PostTournamentChatMessageUseCase(
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

describe('PostTournamentChatMessageUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing-tournament',
        senderUserId: 'user-1',
        text: 'Hola equipo',
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_NO_ENCONTRADO', statusCode: 404 });

    expect(mockChatThreadRepository.getOrCreateForTournamentSV).not.toHaveBeenCalled();
    expect(mockChatMessageRepository.createSV).not.toHaveBeenCalled();
  });

  //? El caso de uso no exige que el emisor sea organizador ni inscrito del
  //? torneo: cualquier usuario autenticado (chequeo que hace el controller,
  //? no este use case) puede publicar en el hilo del torneo.
  it('should post the message to the tournament thread for any authenticated sender', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockChatThreadRepository.getOrCreateForTournamentSV.mockResolvedValue({
      id: 'thread-1',
      matchId: null,
      tournamentId: 'tournament-1',
      createdAt: new Date(),
    });
    const CREATED_AT = new Date();
    mockChatMessageRepository.createSV.mockResolvedValue({
      id: 'message-1',
      threadId: 'thread-1',
      senderUserId: 'user-1',
      senderDisplayName: 'User One',
      text: 'Hola equipo',
      createdAt: CREATED_AT,
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      senderUserId: 'user-1',
      text: 'Hola equipo',
    });

    expect(mockChatThreadRepository.getOrCreateForTournamentSV).toHaveBeenCalledWith('tournament-1');
    expect(mockChatMessageRepository.createSV).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'user-1',
      text: 'Hola equipo',
    });
    expect(RESULT).toEqual({
      threadId: 'thread-1',
      message: {
        id: 'message-1',
        senderUserId: 'user-1',
        senderDisplayName: 'User One',
        text: 'Hola equipo',
        createdAt: CREATED_AT,
      },
    });
  });
});
