import type { DevicePushTokenDTO, DevicePushTokenRepository } from '../../domain/ports/device_push_token_repository.js';

export class ListMyDevicePushTokensUseCase {
  constructor(private readonly _devicePushTokenRepository: DevicePushTokenRepository) {}

  async executeSV(_userId: string): Promise<DevicePushTokenDTO[]> {
    return this._devicePushTokenRepository.listByUserIdSV(_userId);
  }
}

