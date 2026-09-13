import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament match result: organizer access (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let venueId: string;
    let courtId: string;
    let tournamentId: string;

    let organizerUserId: string;
    let organizerToken: string;
    let staffToken: string;
    let unrelatedToken: string;

    let playerAId: string;
    let playerBId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      const CAT = await createTestCategorySV(sportId, `s6a-access-${Date.now()}`, 'Cat S6a Access');
      categoryId = CAT.id;

      const TS = Date.now();

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `s6a-organizer-${TS}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);

      const STAFF = await PRISMA.user.create({
        data: { email: `s6a-staff-${TS}@test.local`, name: 'Staff' },
      });
      staffToken = signAccessTokenSV(STAFF.id, STAFF.email);

      const UNRELATED = await PRISMA.user.create({
        data: { email: `s6a-unrelated-${TS}@test.local`, name: 'Unrelated' },
      });
      unrelatedToken = signAccessTokenSV(UNRELATED.id, UNRELATED.email);

      const PLAYER_A = await PRISMA.user.create({
        data: { email: `s6a-player-a-${TS}@test.local`, name: 'Player A' },
      });
      playerAId = PLAYER_A.id;
      const PLAYER_B = await PRISMA.user.create({
        data: { email: `s6a-player-b-${TS}@test.local`, name: 'Player B' },
      });
      playerBId = PLAYER_B.id;

      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue S6a Access ${TS}`, latitude: -34.6, longitude: -58.4 },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({ data: { name: 'Court S6a Access', venueId } });
      courtId = COURT.id;

      await PRISMA.venueStaff.create({ data: { venueId, userId: STAFF.id } });

      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo S6a Access ${TS}`,
          categoryId,
          sportId,
          formatPresetId: CATALOG.presetAmericanoId,
          organizerUserId,
          status: 'IN_PROGRESS',
        },
      });
      tournamentId = TOURNAMENT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentMatchSV() {
      const MATCH = await PRISMA.match.create({
        data: {
          categoryId,
          sportId,
          organizerUserId,
          type: 'AMERICANO',
          status: 'IN_PROGRESS',
          courtId,
          tournamentId,
        },
      });
      return MATCH.id;
    }

    it('lets the tournament organizer (not venue staff) record a result', async () => {
      const MATCH_ID = await createTournamentMatchSV();

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${tournamentId}/matches/${MATCH_ID}/results`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ scores: [{ userId: playerAId, points: 6 }, { userId: playerBId, points: 3 }] })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.success).toBe(true);

      const STORED = await PRISMA.matchResult.findMany({ where: { matchId: MATCH_ID } });
      expect(STORED).toHaveLength(1);
    });

    it('lets venue staff record a result for a different match, unchanged behavior', async () => {
      const MATCH_ID = await createTournamentMatchSV();

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${tournamentId}/matches/${MATCH_ID}/results`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ scores: [{ userId: playerAId, points: 6 }, { userId: playerBId, points: 4 }] })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
    });

    it('rejects an unrelated user with 403, writing nothing', async () => {
      const MATCH_ID = await createTournamentMatchSV();

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${tournamentId}/matches/${MATCH_ID}/results`)
        .set('Authorization', `Bearer ${unrelatedToken}`)
        .send({ scores: [{ userId: playerAId, points: 6 }, { userId: playerBId, points: 4 }] })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);

      const STORED = await PRISMA.matchResult.findMany({ where: { matchId: MATCH_ID } });
      expect(STORED).toHaveLength(0);
    });
  },
);
