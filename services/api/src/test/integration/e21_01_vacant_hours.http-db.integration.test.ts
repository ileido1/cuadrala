import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 21 — Publicación MATCH vía bookings (antes vacant-hours) (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;
    let venueId: string;
    let courtId: string;
    let staffToken: string;
    let staffUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await createTestCategorySV(sportPadelId, `e21-${TS}`, 'Cat E21');
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Venue E21', latitude: -34.6037, longitude: -58.3816 },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({ data: { name: 'Court E21', venueId } });
      courtId = COURT.id;

      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({
          email: `e21-staff-${TS}@test.local`,
          password: 'password123',
          name: 'Staff E21',
        })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      staffToken = REG.body.data.accessToken as string;
      staffUserId = REG.body.data.user.id as string;

      await PRISMA.venueStaff.create({
        data: { venueId, userId: staffUserId, role: 'OWNER' },
      });
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('crear booking MATCH PUBLISHED -> aparece en /matches/open; cancel -> match y booking cancelados', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const CREATE = await request(APP)
        .post(`/api/v1/venues/${venueId}/bookings`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          type: 'MATCH',
          courtId,
          sportId: sportPadelId,
          categoryId,
          scheduledAt: SCHEDULED_AT,
          organizerUserId: staffUserId,
          visibility: 'PUBLISHED',
          pricePerPlayerCents: 2500,
          maxParticipants: 4,
        })
        .set('Content-Type', 'application/json');

      expect(CREATE.status).toBe(201);
      const BOOKING_ID = CREATE.body.data.id as string;
      const MATCH_ID = CREATE.body.data.matchId as string;
      expect(typeof MATCH_ID).toBe('string');

      const OPEN = await request(APP).get(
        `/api/v1/matches/open?sportId=${sportPadelId}&categoryId=${categoryId}`,
      );
      expect(OPEN.status).toBe(200);
      const OPEN_ITEMS = OPEN.body.data.items as Array<{ id: string }>;
      expect(OPEN_ITEMS.some((_m) => _m.id === MATCH_ID)).toBe(true);

      const MATCH_ROW = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH_ROW).not.toBeNull();
      expect(MATCH_ROW?.status).toBe('SCHEDULED');

      const CANCEL = await request(APP)
        .delete(`/api/v1/venues/${venueId}/bookings/${BOOKING_ID}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(CANCEL.status).toBe(200);
      expect(CANCEL.body.data.status).toBe('CANCELLED');

      const MATCH_CANCELLED = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH_CANCELLED?.status).toBe('CANCELLED');

      const OPEN_AFTER = await request(APP).get(
        `/api/v1/matches/open?sportId=${sportPadelId}&categoryId=${categoryId}`,
      );
      expect(OPEN_AFTER.status).toBe(200);
      const OPEN_ITEMS_AFTER = OPEN_AFTER.body.data.items as Array<{ id: string }>;
      expect(OPEN_ITEMS_AFTER.some((_m) => _m.id === MATCH_ID)).toBe(false);
    });
  },
);
