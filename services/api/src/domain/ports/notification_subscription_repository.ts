export type NotificationSubscriptionDTO = {
  id: string;
  userId: string;
  categoryId: string | null;
  nearLat: number | null;
  nearLng: number | null;
  radiusKm: number | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertNotificationSubscriptionDTO = {
  id?: string;
  userId: string;
  categoryId: string | null;
  nearLat: number | null;
  nearLng: number | null;
  radiusKm: number | null;
  enabled: boolean;
};

export type NotificationSubscriptionRecipientFilterDTO = {
  categoryId: string;
  matchLat: number;
  matchLng: number;
  excludeUserIds: string[];
};

export type NotificationRecipientDTO = {
  userId: string;
  subscriptionId: string;
};

export interface NotificationSubscriptionRepository {
  upsertSV(_dto: UpsertNotificationSubscriptionDTO): Promise<NotificationSubscriptionDTO>;
  listByUserIdSV(_userId: string): Promise<NotificationSubscriptionDTO[]>;
  disableByIdForUserSV(_id: string, _userId: string): Promise<boolean>;
  findRecipientsForEventSV(
    _filter: NotificationSubscriptionRecipientFilterDTO,
  ): Promise<NotificationRecipientDTO[]>;
}

