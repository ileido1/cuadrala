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
  'Tournament match result: duplicate rejection (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let courtId: string;
    let tournamentId: string;
    let organizerUserId: string;
    let organizerToken: string;
    let playerAId: string;
    let playerBId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      const CAT = await createTestCategorySV(sportId, `s6a-dup-${Date.now()}`, 'Cat S6a Dup');
      categoryId = CAT.id;

      const TS = Date.now();

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `s6a-dup-organizer-${TS}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);

      const PLAYER_A = await PRISMA.user.create({
        data: { email: `s6a-dup-player-a-${TS}@test.local`, name: 'Player A' },
      });
      playerAId = PLAYER_A.id;
      const PLAYER_B = await PRISMA.user.create({
        data: { email: `s6a-dup-player-b-${TS}@test.local`, name: 'Player B' },
      });
      playerBId = PLAYER_B.id;

      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue S6a Dup ${TS}`, latitude: -34.6, longitude: -58.4 },
      });
      const COURT = await PRISMA.court.create({ data: { name: 'Court S6a Dup', venueId: VENUE.id } });
      courtId = COURT.id;

      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo S6a Dup ${TS}`,
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

    it('rejects a duplicate result with 409 RESULTADO_YA_CARGADO and writes nothing', async () => {
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

      const FIRST = await request(APP)
        .post(`/api/v1/tournaments/${tournamentId}/matches/${MATCH.id}/results`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ scores: [{ userId: playerAId, points: 6 }, { userId: playerBId, points: 2 }] })
        .set('Content-Type', 'application/json');
      expect(FIRST.status).toBe(201);

      const SECOND = await request(APP)
        .post(`/api/v1/tournaments/${tournamentId}/matches/${MATCH.id}/results`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ scores: [{ userId: playerAId, points: 1 }, { userId: playerBId, points: 6 }] })
        .set('Content-Type', 'application/json');

      expect(SECOND.status).toBe(409);
      expect(SECOND.body.code).toBe('RESULTADO_YA_CARGADO');

      const STORED = await PRISMA.matchResult.findMany({
        where: { matchId: MATCH.id },
        include: { scores: true },
      });
      expect(STORED).toHaveLength(1);
      const SCORE_A = STORED[0]?.scores.find((_s) => _s.userId === playerAId);
      expect(SCORE_A?.points).toBe(6);
    });
  },
);
