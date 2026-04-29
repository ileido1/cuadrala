import { DisableMyDevicePushTokenUseCase } from '../../application/use_cases/disable_my_device_push_token.use_case.js';
import { ListMyDevicePushTokensUseCase } from '../../application/use_cases/list_my_device_push_tokens.use_case.js';
import { UpsertMyDevicePushTokenUseCase } from '../../application/use_cases/upsert_my_device_push_token.use_case.js';
import { PrismaDevicePushTokenRepository } from '../../infrastructure/adapters/prisma_device_push_token_repository.js';

const DEVICE_PUSH_TOKEN_REPOSITORY = new PrismaDevicePushTokenRepository();

export const UPSERT_MY_DEVICE_PUSH_TOKEN_UC = new UpsertMyDevicePushTokenUseCase(
  DEVICE_PUSH_TOKEN_REPOSITORY,
);
export const LIST_MY_DEVICE_PUSH_TOKENS_UC = new ListMyDevicePushTokensUseCase(
  DEVICE_PUSH_TOKEN_REPOSITORY,
);
export const DISABLE_MY_DEVICE_PUSH_TOKEN_UC = new DisableMyDevicePushTokenUseCase(
  DEVICE_PUSH_TOKEN_REPOSITORY,
);

