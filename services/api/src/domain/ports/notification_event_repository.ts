export type NotificationEventDTO = {
  id: string;
  type: 'MATCH_SLOT_OPENED' | 'MATCH_CANCELLED' | 'CHAT_MESSAGE' | 'PAYMENT_PENDING';
  matchId: string;
  categoryId: string;
  payload: unknown;
  createdAt: Date;
  processedAt: Date | null;
};

export type CreateMatchSlotOpenedEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreateMatchCancelledEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreateChatMessageEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreatePaymentPendingEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export interface NotificationEventRepository {
  createMatchSlotOpenedSV(_dto: CreateMatchSlotOpenedEventDTO): Promise<NotificationEventDTO>;
  createMatchCancelledSV(_dto: CreateMatchCancelledEventDTO): Promise<NotificationEventDTO>;
  createChatMessageSV(_dto: CreateChatMessageEventDTO): Promise<NotificationEventDTO>;
  createPaymentPendingSV(_dto: CreatePaymentPendingEventDTO): Promise<NotificationEventDTO>;
  listPendingSV(_limit: number): Promise<NotificationEventDTO[]>;
  countPendingSV(): Promise<number>;
  markProcessedSV(_eventId: string, _processedAt: Date): Promise<void>;
}

