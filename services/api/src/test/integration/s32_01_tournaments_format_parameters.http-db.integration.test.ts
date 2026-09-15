import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 32 — E0-02: formatParameters (http-db)', () => {
  let categoryId: string;
  let sportPadelId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const CAT = await createTestCategorySV(sportPadelId, `s32-01-${Date.now()}`, 'Cat S32-01');
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('rechaza parámetros inválidos con 400 VALIDACION_FALLIDA', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo inválido',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: 'ROUND_ROBIN',
        formatParameters: { doubleRound: 'yes' },
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  //? These cases used to live in a DB-free contract test. The schema they are
  //? judged against now comes from the preset row, so they need a real
  //? category, sport and preset to reach the validator instead of a 404.
  it.each([
    ['AMERICANO', { rounds: 0 }],
    ['ROUND_ROBIN', { doubleRound: true, extra: 1 }],
  ])('%s: rechaza %j con 400 VALIDACION_FALLIDA', async (_code, _params) => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo inválido',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: _code,
        formatParameters: _params,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('acepta parámetros válidos y persiste formatParameters', async () => {
    const FORMAT_PARAMETERS = { rounds: 2, courts: 1 };

    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo válido',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: 'AMERICANO',
        formatParameters: FORMAT_PARAMETERS,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(201);
    const TOURNAMENT_ID = RES.body.data.tournamentId as string;

    const DB_T = await PRISMA.tournament.findUnique({ where: { id: TOURNAMENT_ID } });
    expect(DB_T).not.toBeNull();
    expect(DB_T?.formatParameters).toEqual(FORMAT_PARAMETERS);
  });
});
