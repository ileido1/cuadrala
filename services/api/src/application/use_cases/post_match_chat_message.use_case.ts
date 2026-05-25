import { AppError } from '../../domain/errors/app_error.js';
import type { ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import type { ChatThreadRepository } from '../../domain/ports/chat_thread_repository.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { CreateChatMessageNotificationEventUseCase } from './create_chat_message_notification_event.use_case.js';

export class PostMatchChatMessageUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _chatThreadRepository: ChatThreadRepository,
    private readonly _chatMessageRepository: ChatMessageRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _createChatMessageNotificationEvent: CreateChatMessageNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input: { matchId: string; senderUserId: string; text: string }): Promise<{
    threadId: string;
    message: {
      id: string;
      senderUserId: string;
      senderDisplayName: string;
      text: string;
      createdAt: Date;
    };
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

    await this._notifyParticipantsOfMessageSV({
      matchId: _input.matchId,
      categoryId: MATCH.categoryId,
      senderUserId: _input.senderUserId,
      senderDisplayName: MESSAGE.senderDisplayName,
      messageId: MESSAGE.id,
      textPreview: MESSAGE.text.slice(0, 120),
    });

    return {
      threadId: THREAD.id,
      message: {
        id: MESSAGE.id,
        senderUserId: MESSAGE.senderUserId,
        senderDisplayName: MESSAGE.senderDisplayName,
        text: MESSAGE.text,
        createdAt: MESSAGE.createdAt,
      },
    };
  }

  private async _notifyParticipantsOfMessageSV(_input: {
    matchId: string;
    categoryId: string;
    senderUserId: string;
    senderDisplayName: string;
    messageId: string;
    textPreview: string;
  }): Promise<void> {
    if (this._createChatMessageNotificationEvent === null) {
      return;
    }
    try {
      const PARTICIPANT_IDS =
        await this._matchParticipationRepository.listParticipantUserIdsSV(_input.matchId);
      const RECIPIENTS = PARTICIPANT_IDS.filter((_id) => _id !== _input.senderUserId);
      if (RECIPIENTS.length === 0) {
        return;
      }
      await this._createChatMessageNotificationEvent.executeSV({
        matchId: _input.matchId,
        categoryId: _input.categoryId,
        userIds: RECIPIENTS,
        payload: {
          kind: 'CHAT_MESSAGE',
          messageId: _input.messageId,
          senderUserId: _input.senderUserId,
          senderDisplayName: _input.senderDisplayName,
          textPreview: _input.textPreview,
        },
      });
    } catch {
      // No bloquear el envío del mensaje si falla la notificación.
    }
  }
}

