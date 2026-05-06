import { randomUUID } from 'crypto';

import { AppError } from '../../domain/errors/app_error.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh_token_repository.js';
import type { SocialIdTokenVerifier, SocialProvider } from '../../domain/ports/social_id_token_verifier.js';
import type { TokenService } from '../../domain/ports/token_service.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class SocialLoginUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _tokenService: TokenService,
    private readonly _refreshTokenRepository: RefreshTokenRepository,
    private readonly _idTokenVerifier: SocialIdTokenVerifier,
  ) {}

  async executeSV(_input: {
    provider: SocialProvider;
    idToken: string;
    name?: string;
  }): Promise<{
    userId: string;
    email: string;
    name: string;
    subscriptionType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const CLAIMS = await this._idTokenVerifier.verifyIdTokenSV(_input.provider, _input.idToken);

    const EMAIL = CLAIMS.email.toLowerCase();
    let user = await this._userRepository.findByEmailSV(EMAIL);

    if (user === null) {
      const NAME =
        (typeof _input.name === 'string' && _input.name.trim() !== '' ? _input.name.trim() : undefined) ??
        (typeof CLAIMS.name === 'string' && CLAIMS.name.trim() !== '' ? CLAIMS.name.trim() : undefined) ??
        EMAIL.split('@')[0] ??
        'Usuario';

      user = await this._userRepository.createUserSV({
        emailLower: EMAIL,
        name: NAME,
        passwordHash: null,
      });
    } else if (typeof _input.name === 'string' && _input.name.trim() !== '' && user.name.trim() === '') {
      user = await this._userRepository.updateUserNameSV(user.id, _input.name.trim());
    }

    if (user.email.trim() === '') {
      throw new AppError('ERROR_INTERNO', 'No se pudo iniciar sesión. Intente nuevamente.', 500);
    }

    const ACCESS = this._tokenService.signAccessTokenSV(user.id, user.email);
    const JTI = randomUUID();
    const SESSION_ID = randomUUID();
    const REFRESH = this._tokenService.signRefreshTokenSV(user.id, JTI);
    const EXPIRES_AT = new Date(Date.now() + this._tokenService.getRefreshTokenExpiresInSecondsSV() * 1000);

    await this._refreshTokenRepository.createSV({
      userId: user.id,
      jti: JTI,
      sessionId: SESSION_ID,
      expiresAt: EXPIRES_AT,
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      subscriptionType: user.subscriptionType,
      accessToken: ACCESS,
      refreshToken: REFRESH,
      expiresIn: this._tokenService.getAccessTokenExpiresInSecondsSV(),
    };
  }
}

