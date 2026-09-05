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
import {
  PrismaTournamentSlotHoldLifecycleRepository,
  PrismaTournamentSlotResponseRepository,
} from '../../infrastructure/adapters/prisma_tournament_slot_response_repository.js';

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

/** El jugador contesta si le sirve el horario que le toco. */
export const RESPOND_TOURNAMENT_SLOT_UC = new RespondTournamentSlotUseCase(
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_REGISTRATION_REPOSITORY,
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
);

export const GET_TOURNAMENT_SCHEDULE_UC = new GetTournamentScheduleUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
);

