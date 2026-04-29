import { AppError } from '../../domain/errors/app_error.js';
import type { ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import type { ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class ListTournamentChatMessagesUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _chatThreadRepository: ChatThreadRepository,
    private readonly _chatMessageRepository: ChatMessageRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    limit: number;
    cursorCreatedAt?: Date;
  }): Promise<{ threadId: string; messages: { id: string; senderUserId: string; text: string; createdAt: Date }[] }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const THREAD = await this._chatThreadRepository.getOrCreateForTournamentSV(_input.tournamentId);
    const MESSAGES = await this._chatMessageRepository.listByThreadIdSV({
      threadId: THREAD.id,
      limit: _input.limit,
      cursorCreatedAt: _input.cursorCreatedAt,
    });

    return {
      threadId: THREAD.id,
      messages: MESSAGES.map((_m) => ({
        id: _m.id,
        senderUserId: _m.senderUserId,
        text: _m.text,
        createdAt: _m.createdAt,
      })),
    };
  }
}

