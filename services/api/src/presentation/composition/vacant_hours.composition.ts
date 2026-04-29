import { PublishVacantHourUseCase } from '../../application/use_cases/publish_vacant_hour.use_case.js';
import { ListVacantHoursUseCase } from '../../application/use_cases/list_vacant_hours.use_case.js';
import { CancelVacantHourUseCase } from '../../application/use_cases/cancel_vacant_hour.use_case.js';
import { PrismaMatchStatusRepository } from '../../infrastructure/adapters/prisma_match_status_repository.js';
import { PrismaSystemMatchRepository } from '../../infrastructure/adapters/prisma_system_match_repository.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';
import { PrismaVacantHourRepository } from '../../infrastructure/adapters/prisma_vacant_hour_repository.js';

const VACANT_HOUR_REPOSITORY = new PrismaVacantHourRepository();
const SYSTEM_MATCH_REPOSITORY = new PrismaSystemMatchRepository();
const USER_REPOSITORY = new PrismaUserRepository();
const MATCH_STATUS_REPOSITORY = new PrismaMatchStatusRepository();

export const PUBLISH_VACANT_HOUR_UC = new PublishVacantHourUseCase(
  VACANT_HOUR_REPOSITORY,
  SYSTEM_MATCH_REPOSITORY,
  USER_REPOSITORY,
);

export const LIST_VACANT_HOURS_UC = new ListVacantHoursUseCase(VACANT_HOUR_REPOSITORY);

export const CANCEL_VACANT_HOUR_UC = new CancelVacantHourUseCase(VACANT_HOUR_REPOSITORY, MATCH_STATUS_REPOSITORY);

