import type { PasswordHasher } from '../domain/ports/password_hasher.js';
import type { TokenService } from '../domain/ports/token_service.js';
import type { UserRepository } from '../domain/ports/user_repository.js';

import { LoginUserUseCase } from './use_cases/login_user.use_case.js';
import { RefreshSessionUseCase } from './use_cases/refresh_session.use_case.js';
import { RegisterUserUseCase } from './use_cases/register_user.use_case.js';

export function buildRegisterUserSV(
  _userRepository: UserRepository,
  _passwordHasher: PasswordHasher,
  _tokenService: TokenService,
) {
  const UC = new RegisterUserUseCase(_userRepository, _passwordHasher, _tokenService);
  return UC.executeSV.bind(UC);
}

export function buildLoginUserSV(
  _userRepository: UserRepository,
  _passwordHasher: PasswordHasher,
  _tokenService: TokenService,
) {
  const UC = new LoginUserUseCase(_userRepository, _passwordHasher, _tokenService);
  return UC.executeSV.bind(UC);
}

export function buildRefreshSessionSV(_userRepository: UserRepository, _tokenService: TokenService) {
  const UC = new RefreshSessionUseCase(_userRepository, _tokenService);
  return UC.executeSV.bind(UC);
}
