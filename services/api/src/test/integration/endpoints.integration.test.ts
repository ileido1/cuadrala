import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { ENV_CONST } from '../../config/env.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { seedAmericanoMatchSV } from '../helpers/americano-match.seed.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

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
    const CAT = await createTestCategorySV(sportPadelId, SLUG, 'Categoría test');
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

  it('GET /api/v1/matchmaking/:matchId/suggestions devuelve sugerencias', async () => {
    const CREATED_MATCH = await seedAmericanoMatchSV({
      categoryId,
      participantUserIds: [userA, userB],
    });

    const RES = await request(APP).get(
      `/api/v1/matchmaking/${CREATED_MATCH.matchId}/suggestions?limit=5`,
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
    const RES = await request(APP)
      .post(`/api/v1/ranking/recalculate/${categoryId}`)
      .set('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET);

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
