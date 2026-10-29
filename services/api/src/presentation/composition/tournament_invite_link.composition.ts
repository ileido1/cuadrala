import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { CreateTournamentInviteLinkUseCase } from '../../application/use_cases/create_tournament_invite_link.use_case.js';
import { ListTournamentInviteLinksUseCase } from '../../application/use_cases/list_tournament_invite_links.use_case.js';
import { RevokeTournamentInviteLinkUseCase } from '../../application/use_cases/revoke_tournament_invite_link.use_case.js';
import { GetTournamentInviteLinkPreviewUseCase } from '../../application/use_cases/get_tournament_invite_link_preview.use_case.js';
import { RegisterViaTournamentInviteLinkUseCase } from '../../application/use_cases/register_via_tournament_invite_link.use_case.js';
import { PrismaTournamentInviteLinkRepository } from '../../infrastructure/adapters/prisma_tournament_invite_link_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaVenueRepository } from '../../infrastructure/adapters/prisma_venue_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ENV_CONST } from '../../config/env.js';
import { REGISTER_TOURNAMENT_PARTICIPANT_UC } from './tournament_registration.composition.js';

const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const INVITE_LINK_REPOSITORY = new PrismaTournamentInviteLinkRepository();
const REGISTRATION_REPOSITORY = new PrismaTournamentRegistrationRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);

/** REQ-TIL-001/003/004: solo organizador/staff; expiresAt/maxUses con default y rango. */
export const CREATE_TOURNAMENT_INVITE_LINK_UC = new CreateTournamentInviteLinkUseCase(
  TOURNAMENT_REPOSITORY,
  INVITE_LINK_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  ENV_CONST.PUBLIC_WEB_URL,
);

/** REQ-TIL-006: listado de links con sus registrants. */
export const LIST_TOURNAMENT_INVITE_LINKS_UC = new ListTournamentInviteLinksUseCase(
  TOURNAMENT_REPOSITORY,
  INVITE_LINK_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

/** REQ-TIL-005: revocación idempotente. */
export const REVOKE_TOURNAMENT_INVITE_LINK_UC = new RevokeTournamentInviteLinkUseCase(
  TOURNAMENT_REPOSITORY,
  INVITE_LINK_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
);

/** REQ-TIL-002/012: previsualización pública del torneo detrás del link. */
export const GET_TOURNAMENT_INVITE_LINK_PREVIEW_UC = new GetTournamentInviteLinkPreviewUseCase(
  INVITE_LINK_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  new PrismaSportRepository(),
  new PrismaCategoryRepository(),
  new PrismaVenueRepository(PRISMA),
);

/**
 * REQ-TIL-007/008/009/010: registro autenticado o invitado vía link. Reusa
 * `REGISTER_TOURNAMENT_PARTICIPANT_UC` ya compuesto en
 * `tournament_registration.composition.ts` (design.md, decisión #6), sin
 * tocarlo.
 */
export const REGISTER_VIA_TOURNAMENT_INVITE_LINK_UC = new RegisterViaTournamentInviteLinkUseCase(
  INVITE_LINK_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  REGISTRATION_REPOSITORY,
  REGISTER_TOURNAMENT_PARTICIPANT_UC,
);
