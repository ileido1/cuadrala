import type { ChatMessageDTO, ChatMessageRepository } from '../../domain/ports/chat_message_repository.js';
import { PRISMA } from '../prisma_client.js';

const MESSAGE_SELECT = {
  id: true,
  threadId: true,
  senderUserId: true,
  text: true,
  createdAt: true,
  sender: { select: { name: true } },
} as const;

function mapChatMessageSV(_row: {
  id: string;
  threadId: string;
  senderUserId: string;
  text: string;
  createdAt: Date;
  sender: { name: string };
}): ChatMessageDTO {
  return {
    id: _row.id,
    threadId: _row.threadId,
    senderUserId: _row.senderUserId,
    senderDisplayName: _row.sender.name.trim() || 'Jugador',
    text: _row.text,
    createdAt: _row.createdAt,
  };
}

export class PrismaChatMessageRepository implements ChatMessageRepository {
  async createSV(_input: { threadId: string; senderUserId: string; text: string }): Promise<ChatMessageDTO> {
    const ROW = await PRISMA.chatMessage.create({
      data: {
        threadId: _input.threadId,
        senderUserId: _input.senderUserId,
        text: _input.text,
      },
      select: MESSAGE_SELECT,
    });
    return mapChatMessageSV(ROW);
  }

  async listByThreadIdSV(_input: {
    threadId: string;
    limit: number;
    cursorCreatedAt?: Date;
  }): Promise<ChatMessageDTO[]> {
    const ROWS = await PRISMA.chatMessage.findMany({
      where: {
        threadId: _input.threadId,
        ...( _input.cursorCreatedAt !== undefined ? { createdAt: { lt: _input.cursorCreatedAt } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: _input.limit,
      select: MESSAGE_SELECT,
    });
    return ROWS.map(mapChatMessageSV);
  }
}

