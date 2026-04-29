import type { DevicePushTokenDTO, DevicePushTokenRepository } from '../../domain/ports/device_push_token_repository.js';

export type UpsertMyDevicePushTokenInputDTO = {
  token: string;
  enabled: boolean;
};

export class UpsertMyDevicePushTokenUseCase {
  constructor(private readonly _devicePushTokenRepository: DevicePushTokenRepository) {}

  async executeSV(_userId: string, _input: UpsertMyDevicePushTokenInputDTO): Promise<DevicePushTokenDTO> {
    return this._devicePushTokenRepository.upsertByProviderTokenSV({
      userId: _userId,
      provider: 'FCM',
      token: _input.token,
      enabled: _input.enabled,
    });
  }
}

