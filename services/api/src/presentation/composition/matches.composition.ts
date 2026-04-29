import { ListOpenMatchesUseCase } from '../../application/use_cases/list_open_matches.use_case.js';
import { JoinMatchUseCase } from '../../application/use_cases/join_match.use_case.js';
import { LeaveMatchUseCase } from '../../application/use_cases/leave_match.use_case.js';
import { StartMatchUseCase } from '../../application/use_cases/start_match.use_case.js';
import { FinishMatchUseCase } from '../../application/use_cases/finish_match.use_case.js';
import { CancelMatchUseCase } from '../../application/use_cases/cancel_match.use_case.js';
import { CreateMatchUseCase } from '../../application/use_cases/create_match.use_case.js';
import { GetMatchUseCase } from '../../application/use_cases/get_match.use_case.js';
import { ListMatchesUseCase } from '../../application/use_cases/list_matches.use_case.js';
import { UpdateMatchUseCase } from '../../application/use_cases/update_match.use_case.js';
import { PrismaMatchNotificationContextReadRepository } from '../../infrastructure/adapters/prisma_match_notification_context_read_repository.js';
import { PrismaMatchRepository } from '../../infrastructure/adapters/prisma_match_repository.js';
import { PrismaMatchCrudRepository } from '../../infrastructure/adapters/prisma_match_crud_repository.js';
import { PrismaMatchOrganizerRepository } from '../../infrastructure/adapters/prisma_match_organizer_repository.js';
import { PrismaMatchParticipationRepository } from '../../infrastructure/adapters/prisma_match_participation_repository.js';
import { PrismaMatchQueryRepository } from '../../infrastructure/adapters/prisma_match_query_repository.js';
import { PrismaMatchReadRepository } from '../../infrastructure/adapters/prisma_match_read_repository.js';
import { PrismaMatchStatusRepository } from '../../infrastructure/adapters/prisma_match_status_repository.js';
import { PrismaNotificationEventRepository } from '../../infrastructure/adapters/prisma_notification_event_repository.js';
import { PrismaUserCategoryRepository } from '../../infrastructure/adapters/prisma_user_category_repository.js';

const MATCH_REPOSITORY = new PrismaMatchRepository();
const MATCH_READ_REPOSITORY = new PrismaMatchReadRepository();
const MATCH_QUERY_REPOSITORY = new PrismaMatchQueryRepository();
const MATCH_CRUD_REPOSITORY = new PrismaMatchCrudRepository();
const MATCH_ORGANIZER_REPOSITORY = new PrismaMatchOrganizerRepository();
const MATCH_PARTICIPATION_REPOSITORY = new PrismaMatchParticipationRepository();
const MATCH_STATUS_REPOSITORY = new PrismaMatchStatusRepository();
const USER_CATEGORY_REPOSITORY = new PrismaUserCategoryRepository();
const MATCH_NOTIFICATION_CONTEXT_READ_REPOSITORY = new PrismaMatchNotificationContextReadRepository();
const NOTIFICATION_EVENT_REPOSITORY = new PrismaNotificationEventRepository();

export const LIST_OPEN_MATCHES_UC = new ListOpenMatchesUseCase(MATCH_REPOSITORY);
export const JOIN_MATCH_UC = new JoinMatchUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  USER_CATEGORY_REPOSITORY,
);

export const LEAVE_MATCH_UC = new LeaveMatchUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  MATCH_NOTIFICATION_CONTEXT_READ_REPOSITORY,
  NOTIFICATION_EVENT_REPOSITORY,
);
export const START_MATCH_UC = new StartMatchUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_ORGANIZER_REPOSITORY,
  MATCH_STATUS_REPOSITORY,
);
export const FINISH_MATCH_UC = new FinishMatchUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_ORGANIZER_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  MATCH_STATUS_REPOSITORY,
);

export const LIST_MATCHES_UC = new ListMatchesUseCase(MATCH_QUERY_REPOSITORY);
export const GET_MATCH_UC = new GetMatchUseCase(MATCH_QUERY_REPOSITORY);
export const CREATE_MATCH_UC = new CreateMatchUseCase(MATCH_CRUD_REPOSITORY);
export const UPDATE_MATCH_UC = new UpdateMatchUseCase(
  MATCH_QUERY_REPOSITORY,
  MATCH_ORGANIZER_REPOSITORY,
  MATCH_CRUD_REPOSITORY,
);
export const CANCEL_MATCH_UC = new CancelMatchUseCase(
  MATCH_QUERY_REPOSITORY,
  MATCH_ORGANIZER_REPOSITORY,
  MATCH_CRUD_REPOSITORY,
);

