import { PrismaTournamentInvitationRepository } from '../../infrastructure/adapters/prisma_tournament_invitation_repository.js';
import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { CancelTournamentInvitationUseCase } from '../../application/use_cases/cancel_tournament_invitation.use_case.js';
import { InviteTournamentParticipantUseCase } from '../../application/use_cases/invite_tournament_participant.use_case.js';
import { ListTournamentInvitationsUseCase } from '../../application/use_cases/list_tournament_invitations.use_case.js';
import { RespondTournamentInvitationUseCase } from '../../application/use_cases/respond_tournament_invitation.use_case.js';

const TOURNAMENT_REPO = new PrismaTournamentRepository();
const INVITATION_REPO = new PrismaTournamentInvitationRepository();
const REGISTRATION_REPO = new PrismaTournamentRegistrationRepository();
const VENUE_STAFF_REPO = new PrismaVenueStaffRepository(PRISMA);
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(VENUE_STAFF_REPO);

export const INVITE_TOURNAMENT_PARTICIPANT_UC = new InviteTournamentParticipantUseCase(
  TOURNAMENT_REPO,
  INVITATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

export const RESPOND_TOURNAMENT_INVITATION_UC = new RespondTournamentInvitationUseCase(
  TOURNAMENT_REPO,
  INVITATION_REPO,
  REGISTRATION_REPO,
);

export const LIST_TOURNAMENT_INVITATIONS_UC = new ListTournamentInvitationsUseCase(
  TOURNAMENT_REPO,
  INVITATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

export const CANCEL_TOURNAMENT_INVITATION_UC = new CancelTournamentInvitationUseCase(
  TOURNAMENT_REPO,
  INVITATION_REPO,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);
