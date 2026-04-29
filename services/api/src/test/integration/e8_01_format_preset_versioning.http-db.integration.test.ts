import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 8 — E0-03: Publish preset version + resolve vigente', () => {
  let categoryId: string;
  let sportPadelId: string;
  let presetRoundRobinV1Id: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;
    presetRoundRobinV1Id = CATALOG.presetRoundRobinId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat E8', slug: `e8-${Date.now()}` },
    });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST publish crea v2 activa y torneo por code usa v2; torneo existente sigue en v1', async () => {
    const T1 = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo V1',
        categoryId,
        sportId: sportPadelId,
        formatPresetId: presetRoundRobinV1Id,
      })
      .set('Content-Type', 'application/json');
    expect(T1.status).toBe(201);
    const T1_ID = T1.body.data.tournamentId as string;

    const PUB = await request(APP)
      .post(`/api/v1/sports/${sportPadelId}/tournament-format-presets/ROUND_ROBIN/versions`)
      .send({
        name: 'Todos contra todos (v2)',
        schemaVersion: 2,
        defaultParameters: { doubleRound: true },
      })
      .set('Content-Type', 'application/json');

    expect(PUB.status).toBe(201);
    expect(PUB.body.success).toBe(true);
    expect(PUB.body.data.code).toBe('ROUND_ROBIN');
    expect(PUB.body.data.version).toBe(2);

    const T1_DB = await PRISMA.tournament.findUnique({ where: { id: T1_ID } });
    expect(T1_DB?.formatPresetId).toBe(presetRoundRobinV1Id);

    const T2 = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo vigente',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: 'ROUND_ROBIN',
      })
      .set('Content-Type', 'application/json');

    expect(T2.status).toBe(201);
    expect(T2.body.data.formatPresetId).toBe(PUB.body.data.presetId);
    expect(T2.body.data.presetSchemaVersion).toBe(2);
  });
});

