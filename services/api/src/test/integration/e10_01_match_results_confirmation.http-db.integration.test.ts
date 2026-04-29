import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'E2 — Resultados: borrador + confirmación 4/4 (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;

    let matchId: string;

    const TOKENS: string[] = [];
    const USER_IDS: string[] = [];

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E10', slug: `e10-${TS}` } });
      categoryId = CAT.id;

      for (const _label of ['A', 'B', 'C', 'D']) {
        const REG = await request(APP)
          .post('/api/v1/auth/register')
          .send({ email: `e10-${_label}-${TS}@test.local`, password: 'password123', name: `User ${_label}` })
          .set('Content-Type', 'application/json');
        expect(REG.status).toBe(201);
        TOKENS.push(REG.body.data.accessToken as string);
        USER_IDS.push(REG.body.data.user.id as string);
        await PRISMA.userCategory.create({ data: { userId: REG.body.data.user.id as string, categoryId } });
      }

      const CREATE = await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${TOKENS[0]}`)
        .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
        .set('Content-Type', 'application/json');

      expect(CREATE.status).toBe(201);
      matchId = CREATE.body.data.id as string;

      for (let i = 1; i < 4; i++) {
        const JOIN = await request(APP)
          .post(`/api/v1/matches/${matchId}/join`)
          .set('Authorization', `Bearer ${TOKENS[i]}`);
        expect(JOIN.status).toBe(200);
      }

      const START = await request(APP)
        .post(`/api/v1/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(START.status).toBe(204);

      const FINISH = await request(APP)
        .post(`/api/v1/matches/${matchId}/finish`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(FINISH.status).toBe(204);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('finaliza el resultado al 4/4 CONFIRMED', async () => {
      const DRAFT = await request(APP)
        .put(`/api/v1/matches/${matchId}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[0]}`)
        .send({
          scores: [
            { userId: USER_IDS[0], points: 10 },
            { userId: USER_IDS[1], points: 7 },
            { userId: USER_IDS[2], points: 5 },
            { userId: USER_IDS[3], points: 3 },
          ],
        })
        .set('Content-Type', 'application/json');

      expect(DRAFT.status).toBe(201);

      for (let i = 0; i < 3; i++) {
        const CONF = await request(APP)
          .post(`/api/v1/matches/${matchId}/result-draft/confirm`)
          .set('Authorization', `Bearer ${TOKENS[i]}`)
          .send({ status: 'CONFIRMED' })
          .set('Content-Type', 'application/json');
        expect(CONF.status).toBe(200);
        expect(CONF.body.data.confirmedCount).toBe(i + 1);
      }

      const FINAL = await request(APP)
        .post(`/api/v1/matches/${matchId}/result-draft/confirm`)
        .set('Authorization', `Bearer ${TOKENS[3]}`)
        .send({ status: 'CONFIRMED' })
        .set('Content-Type', 'application/json');

      expect(FINAL.status).toBe(201);
      expect(FINAL.body.success).toBe(true);

      const RESULT = await PRISMA.matchResult.findFirst({
        where: { matchId },
        include: { scores: true },
      });
      expect(RESULT).not.toBeNull();
      expect(RESULT?.scores.length).toBe(4);

      const D = await PRISMA.matchResultDraft.findUnique({ where: { matchId } });
      expect(D?.status).toBe('FINALIZED');

      const RATINGS = await PRISMA.userRating.findMany({
        where: { categoryId },
      });
      expect(RATINGS.length).toBe(4);

      const HISTORY = await PRISMA.userRatingHistory.findMany({
        where: { categoryId },
      });
      expect(HISTORY.length).toBe(4);
    });
  },
);

