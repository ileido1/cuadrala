import { AppError } from '../../domain/errors/app_error.js';
import type { PasswordHasher } from '../../domain/ports/password_hasher.js';
import type { TokenService } from '../../domain/ports/token_service.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class LoginUserUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _passwordHasher: PasswordHasher,
    private readonly _tokenService: TokenService,
  ) {}

  async executeSV(_email: string, _password: string): Promise<{
    userId: string;
    email: string;
    name: string;
    subscriptionType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const USER = await this._userRepository.findByEmailSV(_email.toLowerCase());
    if (USER === null || USER.passwordHash === null) {
      throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
    }

    const MATCH = await this._passwordHasher.compareSV(_password, USER.passwordHash);
    if (!MATCH) {
      throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
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

