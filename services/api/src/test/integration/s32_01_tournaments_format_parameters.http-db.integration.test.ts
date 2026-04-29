import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 32 — E0-02: formatParameters (http-db)', () => {
  let categoryId: string;
  let sportPadelId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat S32-01', slug: `s32-01-${Date.now()}` },
    });
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
