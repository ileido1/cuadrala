export type ChatMessageDTO = {
  id: string;
  threadId: string;
  senderUserId: string;
  text: string;
  createdAt: Date;
};

export interface ChatMessageRepository {
  createSV(_input: { threadId: string; senderUserId: string; text: string }): Promise<ChatMessageDTO>;

  listByThreadIdSV(_input: {
    threadId: string;
    limit: number;
    cursorCreatedAt?: Date;
  }): Promise<ChatMessageDTO[]>;
}

