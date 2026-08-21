import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { InviteGuestTournamentParticipantUseCase } from '../../application/use_cases/invite_guest_tournament_participant.use_case.js';
import { ListTournamentRegistrationsUseCase } from '../../application/use_cases/list_tournament_registrations.use_case.js';
import { RegisterTournamentParticipantUseCase } from '../../application/use_cases/register_tournament_participant.use_case.js';
import { RemoveTournamentRegistrationUseCase } from '../../application/use_cases/remove_tournament_registration.use_case.js';
import { UpdateTournamentRegistrationStatusUseCase } from '../../application/use_cases/update_tournament_registration_status.use_case.js';
import { WithdrawTournamentRegistrationUseCase } from '../../application/use_cases/withdraw_tournament_registration.use_case.js';

const TOURNAMENT_REPO = new PrismaTournamentRepository();
const REGISTRATION_REPO = new PrismaTournamentRegistrationRepository();
const VENUE_STAFF_REPO = new PrismaVenueStaffRepository(PRISMA);
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(VENUE_STAFF_REPO);

export const REGISTER_TOURNAMENT_PARTICIPANT_UC = new RegisterTournamentParticipantUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
);

export const LIST_TOURNAMENT_REGISTRATIONS_UC = new ListTournamentRegistrationsUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
);

export const WITHDRAW_TOURNAMENT_REGISTRATION_UC = new WithdrawTournamentRegistrationUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
);

export const INVITE_GUEST_TOURNAMENT_PARTICIPANT_UC = new InviteGuestTournamentParticipantUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

export const UPDATE_TOURNAMENT_REGISTRATION_STATUS_UC = new UpdateTournamentRegistrationStatusUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

export const REMOVE_TOURNAMENT_REGISTRATION_UC = new RemoveTournamentRegistrationUseCase(
  TOURNAMENT_REPO,
  REGISTRATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);
