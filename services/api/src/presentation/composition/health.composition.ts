import { CheckDatabaseReadyUseCase } from '../../application/use_cases/check_database_ready.use_case.js';
import { PrismaDatabaseHealthRepository } from '../../infrastructure/adapters/prisma_database_health_repository.js';

const DATABASE_HEALTH_REPOSITORY = new PrismaDatabaseHealthRepository();

export const CHECK_DATABASE_READY_UC = new CheckDatabaseReadyUseCase(
  DATABASE_HEALTH_REPOSITORY,
);
