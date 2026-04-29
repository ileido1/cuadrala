import { AppError } from '../../domain/errors/app_error.js';
import type { ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import type { ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';

export class PostMatchChatMessageUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _chatThreadRepository: ChatThreadRepository,
    private readonly _chatMessageRepository: ChatMessageRepository,
  ) {}

  async executeSV(_input: { matchId: string; senderUserId: string; text: string }): Promise<{
    threadId: string;
    message: { id: string; senderUserId: string; text: string; createdAt: Date };
  }> {
    const MATCH = await this._matchReadRepository.findByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const THREAD = await this._chatThreadRepository.getOrCreateForMatchSV(_input.matchId);
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

