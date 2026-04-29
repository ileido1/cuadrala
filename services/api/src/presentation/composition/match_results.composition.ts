import { ConfirmMatchResultDraftUseCase } from '../../application/use_cases/confirm_match_result_draft.use_case.js';
import { ReproposeMatchResultDraftUseCase } from '../../application/use_cases/repropose_match_result_draft.use_case.js';
import { UpsertMatchResultDraftUseCase } from '../../application/use_cases/upsert_match_result_draft.use_case.js';
import { ENV_CONST } from '../../config/env.js';
import { PrismaMatchParticipationRepository } from '../../infrastructure/adapters/prisma_match_participation_repository.js';
import { PrismaMatchReadRepository } from '../../infrastructure/adapters/prisma_match_read_repository.js';
import { PrismaMatchResultDraftRepository } from '../../infrastructure/adapters/prisma_match_result_draft_repository.js';
import { APPLY_ELO_AFTER_MATCH_RESULT_UC } from './ratings.composition.js';

const MATCH_READ_REPOSITORY = new PrismaMatchReadRepository();
const MATCH_PARTICIPATION_REPOSITORY = new PrismaMatchParticipationRepository();
const MATCH_RESULT_DRAFT_REPOSITORY = new PrismaMatchResultDraftRepository();

export const UPSERT_MATCH_RESULT_DRAFT_UC = new UpsertMatchResultDraftUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  MATCH_RESULT_DRAFT_REPOSITORY,
);

export const CONFIRM_MATCH_RESULT_DRAFT_UC = new ConfirmMatchResultDraftUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  MATCH_RESULT_DRAFT_REPOSITORY,
  APPLY_ELO_AFTER_MATCH_RESULT_UC,
  {
    kFactor: ENV_CONST.ELO_K_FACTOR,
    initialRating: ENV_CONST.ELO_INITIAL_RATING,
    minRating: ENV_CONST.ELO_MIN_RATING,
    maxRating: ENV_CONST.ELO_MAX_RATING,
    provisionalGames: ENV_CONST.ELO_PROVISIONAL_GAMES,
    provisionalKMultiplier: ENV_CONST.ELO_PROVISIONAL_K_MULTIPLIER,
  },
);

export const REPROPOSE_MATCH_RESULT_DRAFT_UC = new ReproposeMatchResultDraftUseCase(
  MATCH_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  MATCH_RESULT_DRAFT_REPOSITORY,
);

