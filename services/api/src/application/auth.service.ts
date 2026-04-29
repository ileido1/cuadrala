import type { RefreshTokenRepository } from '../domain/ports/refresh_token_repository.js';
import type { PasswordHasher } from '../domain/ports/password_hasher.js';
import type { TokenService } from '../domain/ports/token_service.js';
import type { UserRepository } from '../domain/ports/user_repository.js';

import { LoginUserUseCase } from './use_cases/login_user.use_case.js';
import { LogoutUseCase } from './use_cases/logout.use_case.js';
import { RefreshSessionUseCase } from './use_cases/refresh_session.use_case.js';
import { RegisterUserUseCase } from './use_cases/register_user.use_case.js';

export function buildRegisterUserSV(
  _userRepository: UserRepository,
  _passwordHasher: PasswordHasher,
  _tokenService: TokenService,
  _refreshTokenRepository: RefreshTokenRepository,
) {
  const UC = new RegisterUserUseCase(
    _userRepository,
    _passwordHasher,
    _tokenService,
    _refreshTokenRepository,
  );
  return UC.executeSV.bind(UC);
}

export function buildLoginUserSV(
  _userRepository: UserRepository,
  _passwordHasher: PasswordHasher,
  _tokenService: TokenService,
  _refreshTokenRepository: RefreshTokenRepository,
) {
  const UC = new LoginUserUseCase(
    _userRepository,
    _passwordHasher,
    _tokenService,
    _refreshTokenRepository,
  );
  return UC.executeSV.bind(UC);
}

export function buildRefreshSessionSV(
  _userRepository: UserRepository,
  _tokenService: TokenService,
  _refreshTokenRepository: RefreshTokenRepository,
) {
  const UC = new RefreshSessionUseCase(_userRepository, _tokenService, _refreshTokenRepository);
  return UC.executeSV.bind(UC);
}

export function buildLogoutSV(_tokenService: TokenService, _refreshTokenRepository: RefreshTokenRepository) {
  const UC = new LogoutUseCase(_tokenService, _refreshTokenRepository);
  return UC.executeSV.bind(UC);
}
