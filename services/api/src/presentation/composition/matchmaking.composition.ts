import { GetMatchmakingSuggestionsV2UseCase } from '../../application/use_cases/get_matchmaking_suggestions_v2.use_case.js';
import { ENV_CONST } from '../../config/env.js';
import { PrismaMatchNotificationContextReadRepository } from '../../infrastructure/adapters/prisma_match_notification_context_read_repository.js';
import { PrismaMatchParticipationRepository } from '../../infrastructure/adapters/prisma_match_participation_repository.js';
import { PrismaMatchmakingCandidateRepository } from '../../infrastructure/adapters/prisma_matchmaking_candidate_repository.js';
import { PrismaRankingEntryReadRepository } from '../../infrastructure/adapters/prisma_ranking_entry_read_repository.js';
import { PrismaUserGeoReadRepository } from '../../infrastructure/adapters/prisma_user_geo_read_repository.js';
import { PrismaUserRatingRepository } from '../../infrastructure/adapters/prisma_user_rating_repository.js';

const MATCH_CONTEXT_REPO = new PrismaMatchNotificationContextReadRepository();
const MATCH_PARTICIPATION_REPO = new PrismaMatchParticipationRepository();
const CANDIDATE_REPO = new PrismaMatchmakingCandidateRepository();
const USER_RATING_REPO = new PrismaUserRatingRepository();
const RANKING_ENTRY_READ_REPO = new PrismaRankingEntryReadRepository();
const USER_GEO_READ_REPO = new PrismaUserGeoReadRepository();

export const GET_MATCHMAKING_SUGGESTIONS_V2_UC = new GetMatchmakingSuggestionsV2UseCase(
  MATCH_CONTEXT_REPO,
  MATCH_PARTICIPATION_REPO,
  CANDIDATE_REPO,
  USER_RATING_REPO,
  RANKING_ENTRY_READ_REPO,
  USER_GEO_READ_REPO,
);

export const MATCHMAKING_DEFAULT_RADIUS_KM = ENV_CONST.MATCHMAKING_DEFAULT_RADIUS_KM;

