import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Integración HTTP + PostgreSQL (TEST_DATABASE_URL)', () => {
  let categoryId: string;
  let userA: string;
  let userB: string;
  let userC: string;
  let sportPadelId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;
    const SLUG = `test-cat-${Date.now()}`;
    const CAT = await PRISMA.category.create({
      data: { name: 'Categoría test', slug: SLUG },
    });
    categoryId = CAT.id;

    const TS = Date.now();
    const U1 = await PRISMA.user.create({
      data: { email: `u1-${TS}@test.local`, name: 'Usuario Uno' },
    });
    const U2 = await PRISMA.user.create({
      data: { email: `u2-${TS}@test.local`, name: 'Usuario Dos' },
    });
    const U3 = await PRISMA.user.create({
      data: { email: `u3-${TS}@test.local`, name: 'Usuario Tres' },
    });
    userA = U1.id;
    userB = U2.id;
    userC = U3.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST /api/v1/americanos crea partido y devuelve 201', async () => {
    const RES = await request(APP)
      .post('/api/v1/americanos')
      .send({
        categoryId,
        participantUserIds: [userA, userB],
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(201);
    expect(RES.body.success).toBe(true);
    expect(RES.body.data).toMatchObject({
      status: 'SCHEDULED',
      type: 'AMERICANO',
      participantCount: 2,
      sportId: sportPadelId,
    });
    expect(typeof RES.body.data.matchId).toBe('string');
  });

  it('GET /api/v1/matchmaking/:matchId/suggestions devuelve sugerencias', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/americanos')
      .send({
        categoryId,
        participantUserIds: [userA, userB],
      })
      .set('Content-Type', 'application/json');

    const MATCH_ID: string = CREATE.body.data.matchId as string;

    const RES = await request(APP).get(
      `/api/v1/matchmaking/${MATCH_ID}/suggestions?limit=5`,
    );

    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
    expect(Array.isArray(RES.body.data.suggestions)).toBe(true);
    const IDS = (RES.body.data.suggestions as { userId: string }[]).map((_s) => _s.userId);
    expect(IDS).not.toContain(userA);
    expect(IDS).not.toContain(userB);
    expect(IDS).toContain(userC);
  });

  it('POST /api/v1/ranking/recalculate/:categoryId recalcula (puede ser 0 entradas)', async () => {
    const RES = await request(APP).post(`/api/v1/ranking/recalculate/${categoryId}`);

    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
    expect(RES.body.data).toMatchObject({
      categoryId,
      entriesUpdated: 0,
    });
  });

  it('GET matchmaking 404 si el partido no existe', async () => {
    const RES = await request(APP).get(
      '/api/v1/matchmaking/550e8400-e29b-41d4-a716-446655440099/suggestions',
    );

    expect(RES.status).toBe(404);
    expect(RES.body.code).toBe('PARTIDO_NO_ENCONTRADO');
  });
});
