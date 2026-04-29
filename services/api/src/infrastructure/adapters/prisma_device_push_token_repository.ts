import { PRISMA } from '../prisma_client.js';

import type {
  DevicePushTokenDTO,
  DevicePushTokenRepository,
  UpsertDevicePushTokenInputDTO,
} from '../../domain/ports/device_push_token_repository.js';

function toDTO(_row: {
  id: string;
  userId: string;
  provider: 'FCM';
  token: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DevicePushTokenDTO {
  return {
    id: _row.id,
    userId: _row.userId,
    provider: _row.provider,
    token: _row.token,
    enabled: _row.enabled,
    createdAt: _row.createdAt,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaDevicePushTokenRepository implements DevicePushTokenRepository {
  async upsertByProviderTokenSV(_dto: UpsertDevicePushTokenInputDTO): Promise<DevicePushTokenDTO> {
    const ROW = await PRISMA.devicePushToken.upsert({
      where: { provider_token: { provider: _dto.provider, token: _dto.token } },
      create: {
        userId: _dto.userId,
        provider: _dto.provider,
        token: _dto.token,
        enabled: _dto.enabled,
      },
      update: {
        userId: _dto.userId,
        enabled: _dto.enabled,
      },
    });
    return toDTO(ROW);
  }

  async listByUserIdSV(_userId: string): Promise<DevicePushTokenDTO[]> {
    const ROWS = await PRISMA.devicePushToken.findMany({
      where: { userId: _userId },
      orderBy: { createdAt: 'desc' },
    });
    return ROWS.map(toDTO);
  }

  async disableByIdSV(_id: string, _userId: string): Promise<{ updatedCount: number }> {
    const RES = await PRISMA.devicePushToken.updateMany({
      where: { id: _id, userId: _userId, enabled: true },
      data: { enabled: false },
    });
    return { updatedCount: RES.count };
  }

  async disableByProviderTokenSV(
    _provider: 'FCM',
    _token: string,
  ): Promise<{ updatedCount: number }> {
    const RES = await PRISMA.devicePushToken.updateMany({
      where: { provider: _provider, token: _token, enabled: true },
      data: { enabled: false },
    });
    return { updatedCount: RES.count };
  }

  async listEnabledTokensByUserIdsSV(
    _userIds: string[],
  ): Promise<Array<{ userId: string; provider: 'FCM'; token: string }>> {
    if (_userIds.length === 0) {
      return [];
    }

    const ROWS = await PRISMA.devicePushToken.findMany({
      where: { enabled: true, userId: { in: _userIds } },
      select: { userId: true, provider: true, token: true },
    });

    return ROWS.map((_r) => ({ userId: _r.userId, provider: _r.provider, token: _r.token }));
  }
}

