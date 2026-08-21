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
  'Sprint 33 — E3-01: Schedule genérico por torneo (Integración HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let presetRoundRobinId: string;
    let organizerId: string;
    let organizerToken: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      const sportPadelId = CATALOG.sportPadelId;
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;
      presetRoundRobinId = CATALOG.presetRoundRobinId;

      const CAT = await createTestCategorySV(sportPadelId, `s33-${Date.now()}`, 'Cat S33');
      categoryId = CAT.id;

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `s33-organizer-${Date.now()}@test.local`, name: 'Organizer S33' },
      });
      organizerId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    /** Crea N usuarios de prueba con una inscripción CONFIRMED al torneo (participantes derivados server-side). */
    async function confirmParticipantsSV(_tournamentId: string, _count: number): Promise<void> {
      const TS = Date.now();
      for (let i = 0; i < _count; i += 1) {
        const USER = await PRISMA.user.create({
          data: { email: `s33-participant-${TS}-${i}@test.local`, name: `Participant ${i}` },
        });
        await PRISMA.tournamentRegistration.create({
          data: { tournamentId: _tournamentId, userId: USER.id, status: 'CONFIRMED' },
        });
      }
    }

    it('AMERICANO: generate es idempotente por scheduleKey y GET devuelve payload', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: 'Torneo S33 Americano',
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId: organizerId,
          status: 'DRAFT',
        },
      });
      const TOURNAMENT_ID = TOURNAMENT.id;
      await confirmParticipantsSV(TOURNAMENT_ID, 4);

      const RES_1 = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(RES_1.status).toBe(201);
      expect(RES_1.body.success).toBe(true);
      expect(RES_1.body.data.created).toBe(true);
      const KEY_1 = RES_1.body.data.schedule.scheduleKey as string;
      expect(KEY_1).toBeDefined();

      const RES_2 = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(RES_2.status).toBe(201);
      expect(RES_2.body.data.created).toBe(false);
      expect(RES_2.body.data.schedule.scheduleKey).toBe(KEY_1);

      const GET = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule`);
      expect(GET.status).toBe(200);
      expect(GET.body.success).toBe(true);
      expect(GET.body.data.tournamentId).toBe(TOURNAMENT_ID);
      expect(GET.body.data.formatCode).toBe('AMERICANO');
      expect(GET.body.data.scheduleKey).toBe(KEY_1);
      expect(GET.body.data.payload).toBeDefined();
    });

    it('ROUND_ROBIN: generate genera calendario correctamente', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: 'Torneo S33 RoundRobin',
          categoryId,
          sportId,
          formatPresetId: presetRoundRobinId,
          organizerUserId: organizerId,
          status: 'DRAFT',
        },
      });
      const TOURNAMENT_ID = TOURNAMENT.id;
      await confirmParticipantsSV(TOURNAMENT_ID, 4);

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.created).toBe(true);
      expect(RES.body.data.schedule.formatCode).toBe('ROUND_ROBIN');
      expect(RES.body.data.schedule.payload.rounds).toBeInstanceOf(Array);
    });
  },
);
