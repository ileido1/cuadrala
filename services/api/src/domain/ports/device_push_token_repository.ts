export type DevicePushTokenProvider = 'FCM';

export type DevicePushTokenDTO = {
  id: string;
  userId: string;
  provider: DevicePushTokenProvider;
  token: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertDevicePushTokenInputDTO = {
  userId: string;
  provider: DevicePushTokenProvider;
  token: string;
  enabled: boolean;
};

export interface DevicePushTokenRepository {
  upsertByProviderTokenSV(_dto: UpsertDevicePushTokenInputDTO): Promise<DevicePushTokenDTO>;
  listByUserIdSV(_userId: string): Promise<DevicePushTokenDTO[]>;
  disableByIdSV(_id: string, _userId: string): Promise<{ updatedCount: number }>;
  disableByProviderTokenSV(
    _provider: DevicePushTokenProvider,
    _token: string,
  ): Promise<{ updatedCount: number }>;
  listEnabledTokensByUserIdsSV(_userIds: string[]): Promise<Array<{ userId: string; provider: DevicePushTokenProvider; token: string }>>;
}

