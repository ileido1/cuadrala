import { GetMyLocationUseCase } from '../../application/use_cases/get_my_location.use_case.js';
import { GetMyOnboardingStatusUseCase, CompleteMyOnboardingUseCase } from '../../application/use_cases/get_my_onboarding_status.use_case.js';
import { ListMyAvailabilityUseCase } from '../../application/use_cases/list_my_availability.use_case.js';
import { ListMySportProfilesUseCase } from '../../application/use_cases/list_my_sport_profiles.use_case.js';
import { ReplaceMyAvailabilityUseCase } from '../../application/use_cases/replace_my_availability.use_case.js';
import { ReplaceMySportProfilesUseCase } from '../../application/use_cases/replace_my_sport_profiles.use_case.js';
import { UpsertMyLocationUseCase } from '../../application/use_cases/upsert_my_location.use_case.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaPlayerProfileRepository } from '../../infrastructure/adapters/prisma_player_profile_repository.js';
import { PrismaPlayerSportProfileRepository } from '../../infrastructure/adapters/prisma_player_sport_profile_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaUserAvailabilityRepository } from '../../infrastructure/adapters/prisma_user_availability_repository.js';
import { PrismaUserCategoryRepository } from '../../infrastructure/adapters/prisma_user_category_repository.js';
import { PrismaUserLocationRepository } from '../../infrastructure/adapters/prisma_user_location_repository.js';

const PLAYER_PROFILE_REPOSITORY = new PrismaPlayerProfileRepository();
const PLAYER_SPORT_PROFILE_REPOSITORY = new PrismaPlayerSportProfileRepository();
const SPORT_REPOSITORY = new PrismaSportRepository();
const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const USER_CATEGORY_REPOSITORY = new PrismaUserCategoryRepository();
const USER_AVAILABILITY_REPOSITORY = new PrismaUserAvailabilityRepository();
const USER_LOCATION_REPOSITORY = new PrismaUserLocationRepository();

export const LIST_MY_SPORT_PROFILES_UC = new ListMySportProfilesUseCase(
  PLAYER_SPORT_PROFILE_REPOSITORY,
  USER_CATEGORY_REPOSITORY,
);
export const REPLACE_MY_SPORT_PROFILES_UC = new ReplaceMySportProfilesUseCase(
  PLAYER_SPORT_PROFILE_REPOSITORY,
  SPORT_REPOSITORY,
  CATEGORY_REPOSITORY,
  USER_CATEGORY_REPOSITORY,
);

export const LIST_MY_AVAILABILITY_UC = new ListMyAvailabilityUseCase(USER_AVAILABILITY_REPOSITORY);
export const REPLACE_MY_AVAILABILITY_UC = new ReplaceMyAvailabilityUseCase(USER_AVAILABILITY_REPOSITORY);

export const GET_MY_LOCATION_UC = new GetMyLocationUseCase(USER_LOCATION_REPOSITORY);
export const UPSERT_MY_LOCATION_UC = new UpsertMyLocationUseCase(USER_LOCATION_REPOSITORY);

export const GET_MY_ONBOARDING_STATUS_UC = new GetMyOnboardingStatusUseCase(
  PLAYER_PROFILE_REPOSITORY,
  PLAYER_SPORT_PROFILE_REPOSITORY,
  USER_LOCATION_REPOSITORY,
  USER_AVAILABILITY_REPOSITORY,
);

export const COMPLETE_MY_ONBOARDING_UC = new CompleteMyOnboardingUseCase(PLAYER_PROFILE_REPOSITORY);
