export type NotificationEventDTO = {
  id: string;
  type: 'MATCH_SLOT_OPENED';
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

export interface NotificationEventRepository {
  createMatchSlotOpenedSV(_dto: CreateMatchSlotOpenedEventDTO): Promise<NotificationEventDTO>;
  listPendingSV(_limit: number): Promise<NotificationEventDTO[]>;
  countPendingSV(): Promise<number>;
  markProcessedSV(_eventId: string, _processedAt: Date): Promise<void>;
}

