import { randomUUID } from 'crypto';

import * as Sentry from '@sentry/node';

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
    // Los tres rechazos de abajo devuelven el mismo AppError('TOKEN_INVALIDO')
    // al cliente a propósito (no hay por qué decirle a un atacante cuál de
    // los tres falló), pero puertas adentro eran indistinguibles — issue
    // #137 se quedó sin poder confirmar por qué fallaba el primer refresh
    // justo después del registro. Este log sí separa el motivo real.
    let PAYLOAD: { sub: string; jti: string };
    try {
      PAYLOAD = this._tokenService.verifyRefreshTokenSV(_refreshToken);
    } catch {
      Sentry.logger.warn('Refresh rechazado: JWT inválido o expirado', {
        'cuadrala.auth.refresh_rejected_reason': 'invalid_jwt',
      });
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
      Sentry.logger.warn(
        Sentry.logger.fmt`Refresh rechazado: token ${PAYLOAD.jti} ya rotado, revocado, vencido o de otro usuario`,
        {
          'cuadrala.auth.refresh_rejected_reason': 'rotation_mismatch',
          'cuadrala.auth.refresh_jti': PAYLOAD.jti,
        },
      );
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const USER = await this._userRepository.findByIdSV(PAYLOAD.sub);
    if (USER === null) {
      Sentry.logger.warn('Refresh rechazado: el usuario del token ya no existe', {
        'cuadrala.auth.refresh_rejected_reason': 'user_not_found',
        'cuadrala.auth.refresh_jti': PAYLOAD.jti,
      });
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

