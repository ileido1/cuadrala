import { LoginUserUseCase } from '../../application/use_cases/login_user.use_case.js';
import { LogoutUseCase } from '../../application/use_cases/logout.use_case.js';
import { RefreshSessionUseCase } from '../../application/use_cases/refresh_session.use_case.js';
import { RegisterUserUseCase } from '../../application/use_cases/register_user.use_case.js';
import { BcryptPasswordHasher } from '../../infrastructure/adapters/bcrypt_password_hasher.js';
import { JwtTokenService } from '../../infrastructure/adapters/jwt_token_service.js';
import { PrismaRefreshTokenRepository } from '../../infrastructure/adapters/prisma_refresh_token_repository.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';

const USER_REPOSITORY = new PrismaUserRepository();
const REFRESH_TOKEN_REPOSITORY = new PrismaRefreshTokenRepository();
const PASSWORD_HASHER = new BcryptPasswordHasher();
const TOKEN_SERVICE = new JwtTokenService();

export const REGISTER_USER_UC = new RegisterUserUseCase(
  USER_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
);
export const LOGIN_USER_UC = new LoginUserUseCase(
  USER_REPOSITORY,
  PASSWORD_HASHER,
  TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
);
export const REFRESH_SESSION_UC = new RefreshSessionUseCase(
  USER_REPOSITORY,
  TOKEN_SERVICE,
  REFRESH_TOKEN_REPOSITORY,
);
export const LOGOUT_UC = new LogoutUseCase(TOKEN_SERVICE, REFRESH_TOKEN_REPOSITORY);

export const AUTH_TOKEN_SERVICE = TOKEN_SERVICE;

