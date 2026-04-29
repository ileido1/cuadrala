import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 33 — E3-01: Schedule genérico por torneo (Integración HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let presetRoundRobinId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;
      presetRoundRobinId = CATALOG.presetRoundRobinId;

      const CAT = await PRISMA.category.create({
        data: { name: 'Cat S33', slug: `s33-${Date.now()}` },
        select: { id: true },
      });
      categoryId = CAT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('AMERICANO: generate es idempotente por scheduleKey y GET devuelve payload', async () => {
      const TS = Date.now();
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s33-${TS}@test.local`, password: 'password123', name: 'User S33' })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);

      const PARTICIPANTS = await Promise.all(
        [0, 1, 2].map(async (_i) => {
          const R = await request(APP)
            .post('/api/v1/auth/register')
            .send({
              email: `s33-${TS}-${_i}@test.local`,
              password: 'password123',
              name: `User S33-${_i}`,
            })
            .set('Content-Type', 'application/json');
          expect(R.status).toBe(201);
          return R.body.data.user.id as string;
        }),
      );

      const PARTICIPANT_IDS = [REG.body.data.user.id as string, ...PARTICIPANTS];

      const TOURNAMENT = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Torneo S33 Americano',
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
        })
        .set('Content-Type', 'application/json');

      expect(TOURNAMENT.status).toBe(201);
      const TOURNAMENT_ID = TOURNAMENT.body.data.tournamentId as string;

      const RES_1 = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({ participantUserIds: PARTICIPANT_IDS })
        .set('Content-Type', 'application/json');
      expect(RES_1.status).toBe(201);
      expect(RES_1.body.success).toBe(true);
      expect(RES_1.body.data.created).toBe(true);
      const KEY_1 = RES_1.body.data.schedule.scheduleKey as string;
      expect(KEY_1).toBeDefined();

      const RES_2 = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({ participantUserIds: PARTICIPANT_IDS })
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

    it('ROUND_ROBIN: generate responde 501 FORMATO_NO_SOPORTADO (MVP)', async () => {
      const TOURNAMENT = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Torneo S33 RoundRobin',
          categoryId,
          sportId,
          formatPresetId: presetRoundRobinId,
        })
        .set('Content-Type', 'application/json');

      expect(TOURNAMENT.status).toBe(201);
      const TOURNAMENT_ID = TOURNAMENT.body.data.tournamentId as string;

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT_ID}/schedule:generate`)
        .send({
          participantUserIds: [
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
            '550e8400-e29b-41d4-a716-446655440004',
          ],
        })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(501);
      expect(RES.body.code).toBe('FORMATO_NO_SOPORTADO');
    });
  },
);

