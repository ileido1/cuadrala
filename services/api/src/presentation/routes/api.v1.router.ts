import { Router } from 'express';

import { AMERICANO_ROUTER } from './americano.router.js';
import { AUTH_ROUTER } from './auth.router.js';
import { CATALOG_ROUTER } from './catalog.router.js';
import { HEALTH_ROUTER } from './health.router.js';
import { MATCHMAKING_ROUTER } from './matchmaking.router.js';
import { MATCHES_ROUTER } from './matches.router.js';
import { MONETIZATION_ROUTER } from './monetization.router.js';
import { NOTIFICATIONS_ROUTER } from './notifications.router.js';
import { PARAMETRIZED_TOURNAMENT_ROUTER } from './parametrized_tournament.router.js';
import { PROFILE_ROUTER } from './profile.router.js';
import { RANKING_ROUTER } from './ranking.router.js';
import { TOURNAMENT_AMERICANO_SCHEDULE_ROUTER } from './tournament_americano_schedule.router.js';
import { TOURNAMENT_SCOREBOARD_ROUTER } from './tournament_scoreboard.router.js';
import { VENUES_ROUTER } from './venues.router.js';
import { GEO_ROUTER } from './geo.router.js';
import { VACANT_HOURS_ROUTER } from './vacant_hours.router.js';
import { RATINGS_ROUTER } from './ratings.router.js';

export const API_V1_ROUTER = Router();

API_V1_ROUTER.use(HEALTH_ROUTER);
API_V1_ROUTER.use(CATALOG_ROUTER);
API_V1_ROUTER.use(PARAMETRIZED_TOURNAMENT_ROUTER);
API_V1_ROUTER.use(TOURNAMENT_AMERICANO_SCHEDULE_ROUTER);
API_V1_ROUTER.use(TOURNAMENT_SCOREBOARD_ROUTER);
API_V1_ROUTER.use(AMERICANO_ROUTER);
API_V1_ROUTER.use(MATCHES_ROUTER);
API_V1_ROUTER.use(MATCHMAKING_ROUTER);
API_V1_ROUTER.use(RANKING_ROUTER);
API_V1_ROUTER.use(VENUES_ROUTER);
API_V1_ROUTER.use(GEO_ROUTER);
API_V1_ROUTER.use(VACANT_HOURS_ROUTER);
API_V1_ROUTER.use(NOTIFICATIONS_ROUTER);
API_V1_ROUTER.use(RATINGS_ROUTER);
API_V1_ROUTER.use('/auth', AUTH_ROUTER);
API_V1_ROUTER.use('/users', PROFILE_ROUTER);
API_V1_ROUTER.use(MONETIZATION_ROUTER);
