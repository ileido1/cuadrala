import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

/**
 * `Tournament.gender` es una columna nullable que reusa `MatchGender`. Los
 * torneos existentes y los clientes legacy que no la mandan tienen que seguir
 * funcionando (`gender: null`); un cliente que sí la manda tiene que verla
 * reflejada tal cual en el detalle y en el listado.
 */
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Tournament.gender opcional (http-db)', () => {
  let categoryId: string;
  let sportPadelId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const CAT = await createTestCategorySV(
      sportPadelId,
      `gender-${Date.now()}`,
      'Cat género',
    );
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  async function createTournamentSV(_body: Record<string, unknown>) {
    return request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Copa Cuádrala',
        categoryId,
        sportId: sportPadelId,
        formatPresetCode: 'ROUND_ROBIN',
        ..._body,
      })
      .set('Content-Type', 'application/json');
  }

  it('should persist gender as null when a legacy client omits it', async () => {
    const CREATE_RES = await createTournamentSV({});
    expect(CREATE_RES.status).toBe(201);
    const TOURNAMENT_ID = CREATE_RES.body.data.tournamentId as string;

    const DETAIL_RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT_ID}`);
    expect(DETAIL_RES.status).toBe(200);
    expect(DETAIL_RES.body.data.tournament.gender).toBeNull();

    const LIST_RES = await request(APP).get('/api/v1/tournaments?limit=100');
    const ITEM = (LIST_RES.body.data.items as Array<Record<string, unknown>>).find(
      (i) => i['id'] === TOURNAMENT_ID,
    );
    expect(ITEM?.['gender']).toBeNull();
  });

  it('should round-trip a declared gender on detail and listing', async () => {
    const CREATE_RES = await createTournamentSV({ gender: 'MALE' });
    expect(CREATE_RES.status).toBe(201);
    const TOURNAMENT_ID = CREATE_RES.body.data.tournamentId as string;

    const DETAIL_RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT_ID}`);
    expect(DETAIL_RES.body.data.tournament.gender).toBe('MALE');

    const LIST_RES = await request(APP).get('/api/v1/tournaments?limit=100');
    const ITEM = (LIST_RES.body.data.items as Array<Record<string, unknown>>).find(
      (i) => i['id'] === TOURNAMENT_ID,
    );
    expect(ITEM?.['gender']).toBe('MALE');
  });

  it('should reject an invalid gender value with 400', async () => {
    const RES = await createTournamentSV({ gender: 'OTRO' });
    expect(RES.status).toBe(400);
  });
});
