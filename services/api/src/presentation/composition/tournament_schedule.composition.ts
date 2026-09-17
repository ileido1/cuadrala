import { GenerateTournamentScheduleUseCase } from '../../application/use_cases/generate_tournament_schedule.use_case.js';
import { GetTournamentScheduleUseCase } from '../../application/use_cases/get_tournament_schedule.use_case.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaTournamentScheduleRepository } from '../../infrastructure/adapters/prisma_tournament_schedule_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { CREATE_TOURNAMENT_NOTIFICATION_EVENT_UC } from './notifications.composition.js';
import { ReserveTournamentScheduleSlotsUseCase } from '../../application/use_cases/reserve_tournament_schedule_slots.use_case.js';
import { PrismaMatchCourtAvailabilityRepository } from '../../infrastructure/adapters/prisma_match_court_availability_repository.js';
import { PrismaTournamentSlotHoldRepository } from '../../infrastructure/adapters/prisma_tournament_slot_hold_repository.js';
import { RespondTournamentSlotUseCase } from '../../application/use_cases/respond_tournament_slot.use_case.js';
import { ListMyTournamentMatchesUseCase } from '../../application/use_cases/list_my_tournament_matches.use_case.js';
import { RescheduleTournamentMatchUseCase } from '../../application/use_cases/reschedule_tournament_match.use_case.js';
import { SettleTournamentSlotAsOrganizerUseCase } from '../../application/use_cases/settle_tournament_slot_as_organizer.use_case.js';
import { PrismaTournamentMatchResultRepository } from '../../infrastructure/adapters/prisma_tournament_match_result_repository.js';
import {
  PrismaTournamentSlotHoldLifecycleRepository,
  PrismaTournamentSlotResponseRepository,
} from '../../infrastructure/adapters/prisma_tournament_slot_response_repository.js';
import { GuestScheduleActionUseCase } from '../../application/use_cases/guest_schedule_action.use_case.js';
import { PrismaTournamentGuestScheduleTokenRepository } from '../../infrastructure/adapters/prisma_tournament_guest_schedule_token_repository.js';
import { ResendEmailSender } from '../../infrastructure/adapters/resend_email_sender.js';
import { ENV_CONST } from '../../config/env.js';

const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const TOURNAMENT_SCHEDULE_REPOSITORY = new PrismaTournamentScheduleRepository();
const TOURNAMENT_REGISTRATION_REPOSITORY = new PrismaTournamentRegistrationRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);

/** Aparta cancha y horario para cada partido del cuadro recien generado. */
export const RESERVE_TOURNAMENT_SCHEDULE_SLOTS_UC = new ReserveTournamentScheduleSlotsUseCase(
  new PrismaMatchCourtAvailabilityRepository(),
  new PrismaTournamentSlotHoldRepository(),
);

/** Los partidos del jugador, con dia, hora, cancha y rival. */
export const LIST_MY_TOURNAMENT_MATCHES_UC = new ListMyTournamentMatchesUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_REGISTRATION_REPOSITORY,
  new PrismaTournamentSlotResponseRepository(),
  new PrismaMatchCourtAvailabilityRepository(),
);

/** El organizador mueve un partido a otro horario o cancha. */
export const RESCHEDULE_TOURNAMENT_MATCH_UC = new RescheduleTournamentMatchUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  new PrismaTournamentSlotHoldLifecycleRepository(),
  new PrismaTournamentSlotHoldRepository(),
  new PrismaTournamentSlotResponseRepository(),
);

/** El organizador cierra o libera el turno sin esperar a los jugadores. */
export const SETTLE_TOURNAMENT_SLOT_AS_ORGANIZER_UC = new SettleTournamentSlotAsOrganizerUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  new PrismaTournamentSlotHoldLifecycleRepository(),
);

/** El jugador contesta si le sirve el horario que le toco. */
export const RESPOND_TOURNAMENT_SLOT_UC = new RespondTournamentSlotUseCase(
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_REGISTRATION_REPOSITORY,
  new PrismaTournamentSlotResponseRepository(),
  new PrismaTournamentSlotHoldLifecycleRepository(),
  TOURNAMENT_REPOSITORY,
  CREATE_TOURNAMENT_NOTIFICATION_EVENT_UC,
);

export const GUEST_SCHEDULE_ACTION_UC = new GuestScheduleActionUseCase(
  new PrismaTournamentGuestScheduleTokenRepository(),
  TOURNAMENT_SCHEDULE_REPOSITORY,
  new PrismaTournamentSlotResponseRepository(),
  new PrismaTournamentSlotHoldLifecycleRepository(),
);

export const GENERATE_TOURNAMENT_SCHEDULE_UC = new GenerateTournamentScheduleUseCase(
  TOURNAMENT_REPOSITORY,
  FORMAT_PRESET_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_REGISTRATION_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  CREATE_TOURNAMENT_NOTIFICATION_EVENT_UC,
  RESERVE_TOURNAMENT_SCHEDULE_SLOTS_UC,
  new PrismaTournamentGuestScheduleTokenRepository(),
  new ResendEmailSender(),
  ENV_CONST.PUBLIC_API_URL,
);

/** El calendario de "hoy" para el organizador: partido, lado y resultado. */
export const GET_TOURNAMENT_SCHEDULE_UC = new GetTournamentScheduleUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_REGISTRATION_REPOSITORY,
  new PrismaMatchCourtAvailabilityRepository(),
  new PrismaTournamentMatchResultRepository(),
  new PrismaTournamentSlotResponseRepository(),
);
