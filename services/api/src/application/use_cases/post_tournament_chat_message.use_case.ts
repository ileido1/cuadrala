import { AppError } from '../../domain/errors/app_error.js';
import type { ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import type { ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';

export class PostTournamentChatMessageUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _chatThreadRepository: ChatThreadRepository,
    private readonly _chatMessageRepository: ChatMessageRepository,
  ) {}

  async executeSV(_input: { tournamentId: string; senderUserId: string; text: string }): Promise<{
    threadId: string;
    message: { id: string; senderUserId: string; text: string; createdAt: Date };
  }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const THREAD = await this._chatThreadRepository.getOrCreateForTournamentSV(_input.tournamentId);
    const MESSAGE = await this._chatMessageRepository.createSV({
      threadId: THREAD.id,
      senderUserId: _input.senderUserId,
      text: _input.text,
    });

    return {
      threadId: THREAD.id,
      message: {
        id: MESSAGE.id,
        senderUserId: MESSAGE.senderUserId,
        text: MESSAGE.text,
        createdAt: MESSAGE.createdAt,
      },
    };
  }
}

