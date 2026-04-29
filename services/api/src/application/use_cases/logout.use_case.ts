import { AppError } from '../../domain/errors/app_error.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh_token_repository.js';
import type { TokenService } from '../../domain/ports/token_service.js';

export class LogoutUseCase {
  constructor(
    private readonly _tokenService: TokenService,
    private readonly _refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async executeSV(_refreshToken: string): Promise<void> {
    let PAYLOAD: { sub: string; jti: string };
    try {
      PAYLOAD = this._tokenService.verifyRefreshTokenSV(_refreshToken);
    } catch {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    await this._refreshTokenRepository.revokeByJtiSV(PAYLOAD.jti);
  }
}

