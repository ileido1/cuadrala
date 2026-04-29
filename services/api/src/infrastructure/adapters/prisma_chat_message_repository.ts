import type { ChatMessageDTO, ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaChatMessageRepository implements ChatMessageRepository {
  async createSV(_input: { threadId: string; senderUserId: string; text: string }): Promise<ChatMessageDTO> {
    return await PRISMA.chatMessage.create({
      data: {
        threadId: _input.threadId,
        senderUserId: _input.senderUserId,
        text: _input.text,
      },
      select: { id: true, threadId: true, senderUserId: true, text: true, createdAt: true },
    });
  }

  async listByThreadIdSV(_input: {
    threadId: string;
    limit: number;
    cursorCreatedAt?: Date;
  }): Promise<ChatMessageDTO[]> {
    return await PRISMA.chatMessage.findMany({
      where: {
        threadId: _input.threadId,
        ...( _input.cursorCreatedAt !== undefined ? { createdAt: { lt: _input.cursorCreatedAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: _input.limit,
      select: { id: true, threadId: true, senderUserId: true, text: true, createdAt: true },
    });
  }
}

