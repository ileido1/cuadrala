import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ENV_CONST } from '../../config/env.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 21 — Vacant hours (publicación rápida) (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;
    let venueId: string;
    let courtId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E21', slug: `e21-${TS}` } });
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Venue E21', latitude: -34.6037, longitude: -58.3816 },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({ data: { name: 'Court E21', venueId } });
      courtId = COURT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('publish -> aparece en /matches/open con match asociado; cancel -> ambos CANCELLED', async () => {
      const SCHEDULED_AT = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const PUBLISH = await request(APP)
        .post('/api/v1/vacant-hours/publish')
        .set('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET)
        .send({
          venueId,
          courtId,
          sportId: sportPadelId,
          categoryId,
          scheduledAt: SCHEDULED_AT,
          pricePerPlayerCents: 2500,
          maxParticipants: 4,
        })
        .set('Content-Type', 'application/json');

      expect(PUBLISH.status).toBe(201);
      const VACANT_HOUR_ID = PUBLISH.body.data.vacantHour.id as string;
      const MATCH_ID = PUBLISH.body.data.matchId as string;

      const OPEN = await request(APP).get(`/api/v1/matches/open?sportId=${sportPadelId}&categoryId=${categoryId}`);
      expect(OPEN.status).toBe(200);
      const OPEN_ITEMS = OPEN.body.data.items as Array<{ id: string }>;
      expect(OPEN_ITEMS.some((_m) => _m.id === MATCH_ID)).toBe(true);

      const MATCH_ROW = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH_ROW).not.toBeNull();
      expect(MATCH_ROW?.status).toBe('SCHEDULED');

      const CANCEL = await request(APP)
        .patch(`/api/v1/vacant-hours/${VACANT_HOUR_ID}/cancel`)
        .set('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET);
      expect(CANCEL.status).toBe(200);
      expect(CANCEL.body.data.vacantHour.status).toBe('CANCELLED');

      const MATCH_CANCELLED = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH_CANCELLED?.status).toBe('CANCELLED');

      const OPEN_AFTER = await request(APP).get(`/api/v1/matches/open?sportId=${sportPadelId}&categoryId=${categoryId}`);
      expect(OPEN_AFTER.status).toBe(200);
      const OPEN_ITEMS_AFTER = OPEN_AFTER.body.data.items as Array<{ id: string }>;
      expect(OPEN_ITEMS_AFTER.some((_m) => _m.id === MATCH_ID)).toBe(false);
    });
  },
);

