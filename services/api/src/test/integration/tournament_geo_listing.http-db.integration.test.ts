import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

//? Coordenadas del centro de búsqueda ("acá estoy") y de dos sedes: una a
//? pocos kilómetros (adentro del radio) y otra a cientos de km (afuera).
const SEARCH_CENTER = { lat: -34.6037, lng: -58.3816 }; // Obelisco, CABA
const NEAR_VENUE = { latitude: -34.6, longitude: -58.42 }; // ~3km del centro
const FAR_VENUE = { latitude: -31.4201, longitude: -64.1888 }; // Córdoba, ~650km del centro

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'GET /tournaments — near/radiusKm/distanceKm (http-db)',
  () => {
    let categoryId: string;
    let sportPadelId: string;
    let staffToken: string;
    let nearVenueId: string;
    let farVenueId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const CAT = await createTestCategorySV(
        sportPadelId,
        `geo-listing-${Date.now()}`,
        'Cat geo',
      );
      categoryId = CAT.id;

      const NEAR = await PRISMA.venue.create({
        data: { name: `Club Cercano ${Date.now()}`, ...NEAR_VENUE },
      });
      nearVenueId = NEAR.id;

      const FAR = await PRISMA.venue.create({
        data: { name: `Club Lejano ${Date.now()}`, ...FAR_VENUE },
      });
      farVenueId = FAR.id;

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `geo-staff-${TS}@test.local`, name: 'Staff' },
      });
      await PRISMA.venueStaff.create({
        data: { venueId: nearVenueId, userId: STAFF.id, role: 'OWNER' },
      });
      await PRISMA.venueStaff.create({
        data: { venueId: farVenueId, userId: STAFF.id, role: 'OWNER' },
      });
      staffToken = signAccessTokenSV(STAFF.id, STAFF.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(_name: string, _venueId?: string): Promise<string> {
      const RES = await request(APP)
        .post('/api/v1/tournaments')
        .send({
          name: _name,
          categoryId,
          sportId: sportPadelId,
          formatPresetCode: 'ROUND_ROBIN',
          ...(_venueId !== undefined ? { venueId: _venueId } : {}),
        })
        .set('Authorization', `Bearer ${staffToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      return RES.body.data.tournamentId as string;
    }

    it('returns only the tournament within radiusKm, with distanceKm', async () => {
      const NEAR_TOURNAMENT_ID = await createTournamentSV('Cerca', nearVenueId);
      const FAR_TOURNAMENT_ID = await createTournamentSV('Lejos', farVenueId);

      const RES = await request(APP).get(
        `/api/v1/tournaments?near=${SEARCH_CENTER.lat},${SEARCH_CENTER.lng}&radiusKm=50&limit=100`,
      );

      expect(RES.status).toBe(200);
      const ITEMS = RES.body.data.items as Array<Record<string, unknown>>;
      const IDS = ITEMS.map((i) => i['id']);

      expect(IDS).toContain(NEAR_TOURNAMENT_ID);
      expect(IDS).not.toContain(FAR_TOURNAMENT_ID);

      const NEAR_ITEM = ITEMS.find((i) => i['id'] === NEAR_TOURNAMENT_ID);
      expect(NEAR_ITEM?.['distanceKm']).toBeTypeOf('number');
      expect(NEAR_ITEM?.['distanceKm'] as number).toBeLessThan(50);
    });

    it('excludes a tournament with no venue from a near-filtered query', async () => {
      const NO_VENUE_TOURNAMENT_ID = await createTournamentSV('Sin sede');

      const RES = await request(APP).get(
        `/api/v1/tournaments?near=${SEARCH_CENTER.lat},${SEARCH_CENTER.lng}&radiusKm=50&limit=100`,
      );

      expect(RES.status).toBe(200);
      const IDS = (RES.body.data.items as Array<Record<string, unknown>>).map((i) => i['id']);
      expect(IDS).not.toContain(NO_VENUE_TOURNAMENT_ID);
    });

    it('omits distanceKm from every item when near is not supplied', async () => {
      await createTournamentSV('Sin filtro geografico', nearVenueId);

      const RES = await request(APP).get('/api/v1/tournaments?limit=100');

      expect(RES.status).toBe(200);
      const ITEMS = RES.body.data.items as Array<Record<string, unknown>>;
      expect(ITEMS.length).toBeGreaterThan(0);
      for (const ITEM of ITEMS) {
        expect(ITEM['distanceKm']).toBeUndefined();
      }
    });
  },
);
