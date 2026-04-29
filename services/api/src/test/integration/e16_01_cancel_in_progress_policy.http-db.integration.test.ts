import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 16 — E2 hardening: Cancelación en IN_PROGRESS (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;

    const TOKENS: string[] = [];
    const USER_IDS: string[] = [];

    async function createUserSV(_label: string, _ts: number): Promise<{ token: string; userId: string }> {
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `e16-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      return { token: REG.body.data.accessToken as string, userId: REG.body.data.user.id as string };
    }

    async function createMatchSV(_token: string, _maxParticipants = 4): Promise<string> {
      const CREATE = await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${_token}`)
        .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: _maxParticipants })
        .set('Content-Type', 'application/json');
      expect(CREATE.status).toBe(201);
      return CREATE.body.data.id as string;
    }

    async function joinSV(_matchId: string, _token: string): Promise<void> {
      const JOIN = await request(APP).post(`/api/v1/matches/${_matchId}/join`).set('Authorization', `Bearer ${_token}`);
      expect(JOIN.status).toBe(200);
    }

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E16', slug: `e16-${TS}` } });
      categoryId = CAT.id;

      for (const _label of ['A', 'B', 'C', 'D', 'E']) {
        const U = await createUserSV(_label, TS);
        TOKENS.push(U.token);
        USER_IDS.push(U.userId);
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
      }
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('start match -> cancel (organizer) -> finish => 409', async () => {
      const MATCH_ID = await createMatchSV(TOKENS[0], 4);
      await joinSV(MATCH_ID, TOKENS[1]);
      await joinSV(MATCH_ID, TOKENS[2]);
      await joinSV(MATCH_ID, TOKENS[3]);

      const START = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/start`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(START.status).toBe(204);

      const CANCEL = await request(APP)
        .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(CANCEL.status).toBe(200);
      expect(CANCEL.body.data.status).toBe('CANCELLED');

      const FINISH = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/finish`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(FINISH.status).toBe(409);
    });

    it('start match -> cancel -> PUT result-draft => 409', async () => {
      const MATCH_ID = await createMatchSV(TOKENS[0], 4);
      await joinSV(MATCH_ID, TOKENS[1]);
      await joinSV(MATCH_ID, TOKENS[2]);
      await joinSV(MATCH_ID, TOKENS[3]);

      const START = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/start`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(START.status).toBe(204);

      const CANCEL = await request(APP)
        .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(CANCEL.status).toBe(200);
      expect(CANCEL.body.data.status).toBe('CANCELLED');

      const DRAFT = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
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
      expect(DRAFT.status).toBe(409);
    });

    it('IN_PROGRESS: cancelar organizer => 200; no-organizer => 403', async () => {
      const MATCH_ID = await createMatchSV(TOKENS[0], 4);
      await joinSV(MATCH_ID, TOKENS[1]);
      await joinSV(MATCH_ID, TOKENS[2]);
      await joinSV(MATCH_ID, TOKENS[3]);

      const START = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/start`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(START.status).toBe(204);

      const CANCEL_NO_ORGANIZER = await request(APP)
        .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
        .set('Authorization', `Bearer ${TOKENS[1]}`);
      expect(CANCEL_NO_ORGANIZER.status).toBe(403);

      const CANCEL_ORGANIZER = await request(APP)
        .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
        .set('Authorization', `Bearer ${TOKENS[0]}`);
      expect(CANCEL_ORGANIZER.status).toBe(200);
      expect(CANCEL_ORGANIZER.body.data.status).toBe('CANCELLED');
    });
  },
);

