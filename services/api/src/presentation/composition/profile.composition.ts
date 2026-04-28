import { GetProfileUseCase } from '../../application/use_cases/get_profile.use_case.js';
import { UpdateProfileUseCase } from '../../application/use_cases/update_profile.use_case.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';

const USER_REPOSITORY = new PrismaUserRepository();

export const GET_PROFILE_UC = new GetProfileUseCase(USER_REPOSITORY);
export const UPDATE_PROFILE_UC = new UpdateProfileUseCase(USER_REPOSITORY);

