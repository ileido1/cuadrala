import { AppError } from '../../domain/errors/app_error.js';
import type { DevicePushTokenRepository } from '../../domain/ports/device_push_token_repository.js';

export class DisableMyDevicePushTokenUseCase {
  constructor(private readonly _devicePushTokenRepository: DevicePushTokenRepository) {}

  async executeSV(_userId: string, _id: string): Promise<void> {
    const RES = await this._devicePushTokenRepository.disableByIdSV(_id, _userId);
    if (RES.updatedCount === 0) {
      throw new AppError('TOKEN_NO_ENCONTRADO', 'El token indicado no existe.', 404);
    }
  }
}

