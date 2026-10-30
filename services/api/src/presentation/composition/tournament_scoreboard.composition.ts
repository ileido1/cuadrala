import { GetTournamentScoreboardUseCase } from '../../application/use_cases/get_tournament_scoreboard.use_case.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { AssertTournamentViewAccessUseCase } from '../../application/use_cases/assert_tournament_view_access.use_case.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentScoreboardRepository } from '../../infrastructure/adapters/prisma_tournament_scoreboard_repository.js';
import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const SCOREBOARD_REPOSITORY = new PrismaTournamentScoreboardRepository();
const TOURNAMENT_REGISTRATION_REPOSITORY = new PrismaTournamentRegistrationRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);
const ASSERT_TOURNAMENT_VIEW_ACCESS_UC = new AssertTournamentViewAccessUseCase(
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  TOURNAMENT_REGISTRATION_REPOSITORY,
);

export const GET_TOURNAMENT_SCOREBOARD_UC = new GetTournamentScoreboardUseCase(
  TOURNAMENT_REPOSITORY,
  SCOREBOARD_REPOSITORY,
  ASSERT_TOURNAMENT_VIEW_ACCESS_UC,
);
