import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('US-E0-03 — Presets de formato versionados', () => {
  let categoryId: string;
  let sportPadelId: string;
  let presetRoundRobinV1Id: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;
    presetRoundRobinV1Id = CATALOG.presetRoundRobinId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat E0-03', slug: `e0-03-${Date.now()}` },
    });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('Torneo en curso mantiene la versión con la que fue creado, aunque exista una nueva versión', async () => {
    const RES_V1 = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo V1',
        categoryId,
        sportId: sportPadelId,
        formatPresetId: presetRoundRobinV1Id,
      })
      .set('Content-Type', 'application/json');

    expect(RES_V1.status).toBe(201);
    const TOURNAMENT_V1_ID = RES_V1.body.data.tournamentId as string;

    const PRESET_V2 = await PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: sportPadelId,
        code: 'ROUND_ROBIN',
        version: 2,
        name: 'Todos contra todos (v2)',
        schemaVersion: 2,
        defaultParameters: { doubleRound: true },
        isActive: true,
        effectiveFrom: new Date(),
        supersedesId: presetRoundRobinV1Id,
      },
    });

    const DB_T1 = await PRISMA.tournament.findUnique({ where: { id: TOURNAMENT_V1_ID } });
    expect(DB_T1).not.toBeNull();
    expect(DB_T1?.formatPresetId).toBe(presetRoundRobinV1Id);

    // sanity: la versión v2 existe y es distinta
    expect(PRESET_V2.id).not.toBe(presetRoundRobinV1Id);
  });

  it('Torneo nuevo referencia la versión vigente al momento de creación (por formatPresetCode)', async () => {
    let presetV2 = await PRISMA.tournamentFormatPreset.findFirst({
      where: { sportId: sportPadelId, code: 'ROUND_ROBIN', version: 2 },
    });
    if (presetV2 === null) {
      presetV2 = await PRISMA.tournamentFormatPreset.create({
        data: {
          sportId: sportPadelId,
          code: 'ROUND_ROBIN',
          version: 2,
          name: 'Todos contra todos (v2)',
          schemaVersion: 2,
          defaultParameters: { doubleRound: true },
          isActive: true,
          effectiveFrom: new Date(),
          supersedesId: presetRoundRobinV1Id,
        },
      });
    }

    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo vigente',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: 'ROUND_ROBIN',
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(201);
    expect(RES.body.data.formatPresetId).toBe(presetV2.id);
    expect(RES.body.data.presetSchemaVersion).toBe(presetV2.schemaVersion);
  });
});

