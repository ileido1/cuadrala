import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 12 — Dynamic filters: /matches/open (precio + geo) (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;

    let tokenA: string;
    let userAId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E12', slug: `e12-${TS}` } });
      categoryId = CAT.id;

      const REG_A = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `e12-a-${TS}@test.local`, password: 'password123', name: 'User A' })
        .set('Content-Type', 'application/json');
      expect(REG_A.status).toBe(201);
      tokenA = REG_A.body.data.accessToken as string;
      userAId = REG_A.body.data.user.id as string;
      await PRISMA.userCategory.create({ data: { userId: userAId, categoryId } });

      const VENUE_NEAR = await PRISMA.venue.create({
        data: { name: 'Near venue', latitude: -34.6037, longitude: -58.3816 },
      });
      const COURT_NEAR = await PRISMA.court.create({ data: { name: 'Court near', venueId: VENUE_NEAR.id } });

      const VENUE_FAR = await PRISMA.venue.create({
        data: { name: 'Far venue', latitude: -31.4201, longitude: -64.1888 },
      });
      const COURT_FAR = await PRISMA.court.create({ data: { name: 'Court far', venueId: VENUE_FAR.id } });

      // Match near y barato
      await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          sportId: sportPadelId,
          categoryId,
          type: 'REGULAR',
          maxParticipants: 4,
          courtId: COURT_NEAR.id,
          pricePerPlayerCents: 1000,
        })
        .set('Content-Type', 'application/json');

      // Match near y caro
      await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          sportId: sportPadelId,
          categoryId,
          type: 'REGULAR',
          maxParticipants: 4,
          courtId: COURT_NEAR.id,
          pricePerPlayerCents: 9000,
        })
        .set('Content-Type', 'application/json');

      // Match far
      await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          sportId: sportPadelId,
          categoryId,
          type: 'REGULAR',
          maxParticipants: 4,
          courtId: COURT_FAR.id,
          pricePerPlayerCents: 1000,
        })
        .set('Content-Type', 'application/json');
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('filtra por precio (min/max) y geocerca (near+radiusKm)', async () => {
      const RES = await request(APP).get(
        `/api/v1/matches/open?sportId=${sportPadelId}&categoryId=${categoryId}&near=-34.6037,-58.3816&radiusKm=5&minPricePerPlayerCents=0&maxPricePerPlayerCents=2000`,
      );

      expect(RES.status).toBe(200);
      const ITEMS = RES.body.data.items as Array<{ pricePerPlayerCents: number }>;
      expect(Array.isArray(ITEMS)).toBe(true);
      expect(ITEMS.length).toBe(1);
      expect(ITEMS[0]?.pricePerPlayerCents).toBe(1000);
    });
  },
);

