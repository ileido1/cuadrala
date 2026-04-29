import { randomUUID } from 'crypto';

import { AppError } from '../../domain/errors/app_error.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh_token_repository.js';
import type { TokenService } from '../../domain/ports/token_service.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class RefreshSessionUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _tokenService: TokenService,
    private readonly _refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async executeSV(_refreshToken: string): Promise<{
    userId: string;
    email: string;
    name: string;
    subscriptionType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    let PAYLOAD: { sub: string; jti: string };
    try {
      PAYLOAD = this._tokenService.verifyRefreshTokenSV(_refreshToken);
    } catch {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const NEW_JTI = randomUUID();
    const NEW_EXPIRES_AT = new Date(
      Date.now() + this._tokenService.getRefreshTokenExpiresInSecondsSV() * 1000,
    );
    const ROTATED = await this._refreshTokenRepository.rotateSV({
      oldJti: PAYLOAD.jti,
      newJti: NEW_JTI,
      newExpiresAt: NEW_EXPIRES_AT,
    });

    if (ROTATED === null || ROTATED.userId !== PAYLOAD.sub) {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const USER = await this._userRepository.findByIdSV(PAYLOAD.sub);
    if (USER === null) {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const ACCESS = this._tokenService.signAccessTokenSV(USER.id, USER.email);
    const REFRESH = this._tokenService.signRefreshTokenSV(USER.id, NEW_JTI);

    return {
      userId: USER.id,
      email: USER.email,
      name: USER.name,
      subscriptionType: USER.subscriptionType,
      accessToken: ACCESS,
      refreshToken: REFRESH,
      expiresIn: this._tokenService.getAccessTokenExpiresInSecondsSV(),
    };
  }
}

