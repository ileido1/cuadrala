import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('E0 — Catálogo multi-deporte y torneo parametrizable', () => {
  let categoryId: string;
  let sportPadelId: string;
  let presetRoundRobinId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;
    presetRoundRobinId = CATALOG.presetRoundRobinId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat E0', slug: `e0-${Date.now()}` },
    });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('GET /api/v1/sports lista PADEL', async () => {
    const RES = await request(APP).get('/api/v1/sports');

    expect(RES.status).toBe(200);
    expect(RES.body.data.sports.some((_s: { code: string }) => _s.code === 'PADEL')).toBe(true);
  });

  it('GET /api/v1/sports/:sportId/tournament-format-presets incluye AMERICANO y ROUND_ROBIN', async () => {
    const RES = await request(APP).get(
      `/api/v1/sports/${sportPadelId}/tournament-format-presets`,
    );

    expect(RES.status).toBe(200);
    const CODES = (RES.body.data.presets as { code: string }[]).map((_p) => _p.code);
    expect(CODES).toContain('AMERICANO');
    expect(CODES).toContain('ROUND_ROBIN');
  });

  it('POST /api/v1/tournaments crea torneo con formato ROUND_ROBIN', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo E0',
        categoryId,
        sportId: sportPadelId,
        formatPresetId: presetRoundRobinId,
        formatParameters: { doubleRound: true },
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(201);
    expect(RES.body.data.tournamentId).toBeDefined();
    expect(RES.body.data.sportId).toBe(sportPadelId);
    expect(RES.body.data.formatPresetId).toBe(presetRoundRobinId);
  });
});
