import { GetDashboardStatsUseCase } from '../../application/use_cases/venue_dashboard.use_cases.js';
import {
  GetTransactionStatsUseCase,
  ListVenueTransactionHistoryUseCase,
} from '../../application/use_cases/venue_transactions.use_cases.js';
import { UpdateVenueUseCase } from '../../application/use_cases/venue.use_cases.js';
import { ListVenueMatchesUseCase } from '../../application/use_cases/list_venue_matches.use_case.js';
import { PrismaMatchQueryRepository } from '../../infrastructure/adapters/prisma_match_query_repository.js';
import { PrismaVenueAnalyticsRepository } from '../../infrastructure/adapters/prisma_venue_analytics_repository.js';
import { PrismaVenueRepository } from '../../infrastructure/adapters/prisma_venue_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';

const VENUE_REPOSITORY = new PrismaVenueRepository();
const VENUE_ANALYTICS_REPOSITORY = new PrismaVenueAnalyticsRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();
const MATCH_QUERY_REPOSITORY = new PrismaMatchQueryRepository();

export const GET_DASHBOARD_STATS_UC = new GetDashboardStatsUseCase(VENUE_ANALYTICS_REPOSITORY);
export const GET_TRANSACTION_STATS_UC = new GetTransactionStatsUseCase(VENUE_ANALYTICS_REPOSITORY);
export const LIST_VENUE_TRANSACTION_HISTORY_UC = new ListVenueTransactionHistoryUseCase(
  VENUE_ANALYTICS_REPOSITORY,
);
export const UPDATE_VENUE_UC = new UpdateVenueUseCase(VENUE_REPOSITORY);
export const LIST_VENUE_MATCHES_UC = new ListVenueMatchesUseCase(
  MATCH_QUERY_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export { VENUE_STAFF_REPOSITORY };
