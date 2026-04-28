import { AppError } from '../../domain/errors/app_error.js';
import type { TokenService } from '../../domain/ports/token_service.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class RefreshSessionUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _tokenService: TokenService,
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
    let PAYLOAD: { sub: string };
    try {
      PAYLOAD = this._tokenService.verifyRefreshTokenSV(_refreshToken);
    } catch {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const USER = await this._userRepository.findByIdSV(PAYLOAD.sub);
    if (USER === null) {
      throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }

    const ACCESS = this._tokenService.signAccessTokenSV(USER.id, USER.email);
    const REFRESH = this._tokenService.signRefreshTokenSV(USER.id);

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

