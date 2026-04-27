import { Router } from 'express';

import { AMERICANO_ROUTER } from './americano.router.js';
import { AUTH_ROUTER } from './auth.router.js';
import { CATALOG_ROUTER } from './catalog.router.js';
import { HEALTH_ROUTER } from './health.router.js';
import { MATCHMAKING_ROUTER } from './matchmaking.router.js';
import { MONETIZATION_ROUTER } from './monetization.router.js';
import { PARAMETRIZED_TOURNAMENT_ROUTER } from './parametrized_tournament.router.js';
import { PROFILE_ROUTER } from './profile.router.js';
import { RANKING_ROUTER } from './ranking.router.js';

export const API_V1_ROUTER = Router();

API_V1_ROUTER.use(HEALTH_ROUTER);
API_V1_ROUTER.use(CATALOG_ROUTER);
API_V1_ROUTER.use(PARAMETRIZED_TOURNAMENT_ROUTER);
API_V1_ROUTER.use(AMERICANO_ROUTER);
API_V1_ROUTER.use(MATCHMAKING_ROUTER);
API_V1_ROUTER.use(RANKING_ROUTER);
API_V1_ROUTER.use('/auth', AUTH_ROUTER);
API_V1_ROUTER.use('/users', PROFILE_ROUTER);
API_V1_ROUTER.use(MONETIZATION_ROUTER);
