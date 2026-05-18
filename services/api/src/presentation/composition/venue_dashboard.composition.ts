import { AssertVenueStaffAccessUseCase } from '../../application/use_cases/assert_venue_staff_access.use_case.js';
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
import { PRISMA } from '../../infrastructure/prisma_client.js';

const VENUE_REPOSITORY = new PrismaVenueRepository(PRISMA);
const VENUE_ANALYTICS_REPOSITORY = new PrismaVenueAnalyticsRepository(PRISMA);
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const MATCH_QUERY_REPOSITORY = new PrismaMatchQueryRepository(PRISMA);

export const ASSERT_VENUE_STAFF_UC = new AssertVenueStaffAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);
export const GET_DASHBOARD_STATS_UC = new GetDashboardStatsUseCase(VENUE_ANALYTICS_REPOSITORY);
export const GET_TRANSACTION_STATS_UC = new GetTransactionStatsUseCase(VENUE_ANALYTICS_REPOSITORY);
export const LIST_VENUE_TRANSACTION_HISTORY_UC = new ListVenueTransactionHistoryUseCase(
  VENUE_ANALYTICS_REPOSITORY,
);
export const UPDATE_VENUE_UC = new UpdateVenueUseCase(VENUE_REPOSITORY);
export const LIST_VENUE_MATCHES_UC = new ListVenueMatchesUseCase(MATCH_QUERY_REPOSITORY);
