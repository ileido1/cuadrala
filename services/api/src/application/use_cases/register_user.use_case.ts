import { randomUUID } from 'crypto';

import { AppError } from '../../domain/errors/app_error.js';
import type { PasswordHasher } from '../../domain/ports/password_hasher.js';
import type { RefreshTokenRepository } from '../../domain/ports/refresh_token_repository.js';
import type { TokenService } from '../../domain/ports/token_service.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class RegisterUserUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _passwordHasher: PasswordHasher,
    private readonly _tokenService: TokenService,
    private readonly _refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async executeSV(_email: string, _password: string, _name: string): Promise<{
    userId: string;
    email: string;
    name: string;
    subscriptionType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const EMAIL = _email.toLowerCase();
    const EXISTING = await this._userRepository.findByEmailSV(EMAIL);
    if (EXISTING !== null) {
      throw new AppError('EMAIL_YA_REGISTRADO', 'Ya existe una cuenta con este correo.', 409);
    }

    const HASH = await this._passwordHasher.hashSV(_password);
    const USER = await this._userRepository.createUserSV({
      emailLower: EMAIL,
      name: _name.trim(),
      passwordHash: HASH,
    });

    const ACCESS = this._tokenService.signAccessTokenSV(USER.id, USER.email);
    const JTI = randomUUID();
    const SESSION_ID = randomUUID();
    const REFRESH = this._tokenService.signRefreshTokenSV(USER.id, JTI);
    const EXPIRES_AT = new Date(Date.now() + this._tokenService.getRefreshTokenExpiresInSecondsSV() * 1000);

    await this._refreshTokenRepository.createSV({
      userId: USER.id,
      jti: JTI,
      sessionId: SESSION_ID,
      expiresAt: EXPIRES_AT,
    });

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

