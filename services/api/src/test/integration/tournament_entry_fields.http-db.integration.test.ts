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
 * Los cuatro datos que el jugador necesita para decidir si entra —nivel,
 * precio, cuándo y dónde— tienen que sobrevivir el viaje completo: se mandan
 * al crear el torneo y se leen en el listado y en el detalle.
 *
 * Antes de este slice `POST /tournaments` no aceptaba sede ni precio, y el DTO
 * de lectura no los devolvía: la pantalla "¿Puedo entrar?" no tenía con qué
 * responderse.
 */
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Datos de entrada del torneo: sede, precio, cupos y cierre (http-db)',
  () => {
    let categoryId: string;
    let sportPadelId: string;
    let venueId: string;
    let venueName: string;

    const CLOSES_AT = '2026-09-11T20:00:00.000Z';

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const CAT = await createTestCategorySV(
        sportPadelId,
        `entry-fields-${Date.now()}`,
        'Cat entrada',
      );
      categoryId = CAT.id;

      venueName = `Club Cuádrala ${Date.now()}`;
      const VENUE = await PRISMA.venue.create({ data: { name: venueName } });
      venueId = VENUE.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(): Promise<string> {
      const RES = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Copa Cuádrala',
          categoryId,
          sportId: sportPadelId,
          formatPresetCode: 'ROUND_ROBIN',
          venueId,
          inscriptionPrice: 12.5,
          maxSlots: 16,
          registrationClosesAt: CLOSES_AT,
          visibility: 'PUBLIC',
        })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      return RES.body.data.tournamentId as string;
    }

    it('should keep venue, price, slots and deadline on the detail', async () => {
      const TOURNAMENT_ID = await createTournamentSV();

      const RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT_ID}`);

      expect(RES.status).toBe(200);
      const { tournament } = RES.body.data;
      expect(tournament.venueId).toBe(venueId);
      expect(tournament.venueName).toBe(venueName);
      expect(tournament.inscriptionPrice).toBe(12.5);
      expect(tournament.maxSlots).toBe(16);
      expect(tournament.registrationClosesAt).toBe(CLOSES_AT);
    });

    it('should expose the same four fields on the catalog listing', async () => {
      const TOURNAMENT_ID = await createTournamentSV();

      const RES = await request(APP).get('/api/v1/tournaments?limit=100');

      expect(RES.status).toBe(200);
      const ITEM = (RES.body.data.items as Array<Record<string, unknown>>).find(
        (i) => i['id'] === TOURNAMENT_ID,
      );
      expect(ITEM).toBeDefined();
      expect(ITEM?.['venueName']).toBe(venueName);
      expect(ITEM?.['inscriptionPrice']).toBe(12.5);
      expect(ITEM?.['maxSlots']).toBe(16);
      expect(ITEM?.['registrationClosesAt']).toBe(CLOSES_AT);
    });

    //? Un torneo sin sede ni precio sigue siendo valido: los cuatro campos son
    //? opcionales y el cliente tiene que poder distinguir "gratis" de "no lo
    //? declararon".
    it('should return nulls when the organizer declared none of them', async () => {
      const CREATED = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Torneo sin datos',
          categoryId,
          sportId: sportPadelId,
          formatPresetCode: 'ROUND_ROBIN',
        })
        .set('Content-Type', 'application/json');
      expect(CREATED.status).toBe(201);

      const RES = await request(APP).get(
        `/api/v1/tournaments/${CREATED.body.data.tournamentId}`,
      );

      expect(RES.status).toBe(200);
      const { tournament } = RES.body.data;
      expect(tournament.venueId).toBeNull();
      expect(tournament.venueName).toBeNull();
      expect(tournament.inscriptionPrice).toBeNull();
      expect(tournament.maxSlots).toBeNull();
      expect(tournament.registrationClosesAt).toBeNull();
    });

    it('should reject a deadline that falls after the tournament starts', async () => {
      const RES = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Cierre al reves',
          categoryId,
          sportId: sportPadelId,
          formatPresetCode: 'ROUND_ROBIN',
          startsAt: '2026-09-10T09:00:00.000Z',
          registrationClosesAt: '2026-09-12T09:00:00.000Z',
        })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    });

    it('should reject a non-positive slot count', async () => {
      const RES = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: 'Cupos invalidos',
          categoryId,
          sportId: sportPadelId,
          formatPresetCode: 'ROUND_ROBIN',
          maxSlots: 1,
        })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    });
  },
);
