import { AppError } from '../../domain/errors/app_error.js';
import type { ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import type { ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';

export class ListMatchChatMessagesUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _chatThreadRepository: ChatThreadRepository,
    private readonly _chatMessageRepository: ChatMessageRepository,
  ) {}

  async executeSV(_input: {
    matchId: string;
    limit: number;
    cursorCreatedAt?: Date;
  }): Promise<{ threadId: string; messages: { id: string; senderUserId: string; text: string; createdAt: Date }[] }> {
    const MATCH = await this._matchReadRepository.findByIdSV(_input.matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const THREAD = await this._chatThreadRepository.getOrCreateForMatchSV(_input.matchId);
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

