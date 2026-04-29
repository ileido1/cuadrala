import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 27 — Integración HTTP + DB: ranking recalc idempotente',
  () => {
    beforeAll(async () => {
      await resetDatabaseForTestsSV();
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('recalc 2 veces => mismas filas (sin duplicados)', async () => {
      const SPORT = await PRISMA.sport.create({
        data: { code: `S27-${Date.now()}`, name: 'Padel Test S27' },
      });
      const CATEGORY = await PRISMA.category.create({
        data: { name: 'Categoria S27', slug: `categoria-s27-${Date.now()}` },
      });

      const USER_A = await PRISMA.user.create({
        data: { email: `s27-a-${Date.now()}@test.local`, name: 'Usuario A S27' },
      });
      const USER_B = await PRISMA.user.create({
        data: { email: `s27-b-${Date.now()}@test.local`, name: 'Usuario B S27' },
      });

      const MATCH = await PRISMA.match.create({
        data: {
          categoryId: CATEGORY.id,
          sportId: SPORT.id,
          organizerUserId: USER_A.id,
          type: 'AMERICANO',
          status: 'FINISHED',
        },
      });

      const RESULT = await PRISMA.matchResult.create({
        data: {
          matchId: MATCH.id,
          scores: {
            create: [
              { userId: USER_A.id, points: 21 },
              { userId: USER_B.id, points: 18 },
            ],
          },
        },
        include: { scores: true },
      });
      expect(RESULT.scores).toHaveLength(2);

      const RUN_1 = await request(APP).post(`/api/v1/ranking/recalculate/${CATEGORY.id}`);
      expect(RUN_1.status).toBe(200);
      expect(RUN_1.body.success).toBe(true);
      expect(RUN_1.body.data).toMatchObject({
        categoryId: CATEGORY.id,
        entriesUpdated: 2,
      });

      const ENTRIES_1 = await PRISMA.rankingEntry.findMany({
        where: { categoryId: CATEGORY.id },
        orderBy: [{ userId: 'asc' }],
        select: { categoryId: true, userId: true, points: true, gamesPlayed: true },
      });

      const RUN_2 = await request(APP).post(`/api/v1/ranking/recalculate/${CATEGORY.id}`);
      expect(RUN_2.status).toBe(200);
      expect(RUN_2.body.success).toBe(true);
      expect(RUN_2.body.data).toMatchObject({
        categoryId: CATEGORY.id,
        entriesUpdated: 2,
      });

      const ENTRIES_2 = await PRISMA.rankingEntry.findMany({
        where: { categoryId: CATEGORY.id },
        orderBy: [{ userId: 'asc' }],
        select: { categoryId: true, userId: true, points: true, gamesPlayed: true },
      });

      expect(ENTRIES_1).toEqual(ENTRIES_2);
      expect(ENTRIES_2).toHaveLength(2);
      expect(ENTRIES_2).toEqual([
        {
          categoryId: CATEGORY.id,
          userId: USER_A.id,
          points: 21,
          gamesPlayed: 1,
        },
        {
          categoryId: CATEGORY.id,
          userId: USER_B.id,
          points: 18,
          gamesPlayed: 1,
        },
      ]);
    });
  },
);

