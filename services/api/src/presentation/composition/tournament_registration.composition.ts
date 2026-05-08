import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { ListTournamentRegistrationsUseCase } from '../../application/use_cases/list_tournament_registrations.use_case.js';
import { RegisterTournamentParticipantUseCase } from '../../application/use_cases/register_tournament_participant.use_case.js';
import { WithdrawTournamentRegistrationUseCase } from '../../application/use_cases/withdraw_tournament_registration.use_case.js';

const TOURNAMENT_REPO = new PrismaTournamentRepository();
const REGISTRATION_REPO = new PrismaTournamentRegistrationRepository();

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
