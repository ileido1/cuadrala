import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { ENV_CONST } from '../../config/env.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 35 — Preferencias por tipo en notificaciones (Integración HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      const CAT = await PRISMA.category.create({
        data: { name: 'Cat S35', slug: `s35-${Date.now()}` },
        select: { id: true },
      });
      categoryId = CAT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('si enabledTypes deshabilita MATCH_SLOT_OPENED => dispatch no crea deliveries', async () => {
      const TS = Date.now();
      const SUBSCRIBER = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s35-${TS}@test.local`, password: 'password123', name: 'User S35' })
        .set('Content-Type', 'application/json');
      expect(SUBSCRIBER.status).toBe(201);
      const SUBSCRIBER_ID = SUBSCRIBER.body.data.user.id as string;
      const TOKEN = SUBSCRIBER.body.data.accessToken as string;

      // Subscription (geo coincide) pero deshabilita el tipo
      const SUB = await request(APP)
        .post('/api/v1/users/me/notification-subscriptions')
        .set('Authorization', `Bearer ${TOKEN}`)
        .send({
          categoryId,
          nearLat: -34.0,
          nearLng: -58.0,
          radiusKm: 50,
          enabled: true,
          enabledTypes: { MATCH_SLOT_OPENED: false },
        })
        .set('Content-Type', 'application/json');
      expect(SUB.status).toBe(200);

      // Token push para que el usuario sea elegible
      await PRISMA.devicePushToken.create({
        data: { userId: SUBSCRIBER_ID, provider: 'FCM', token: `tok-${TS}`, enabled: true },
        select: { id: true },
      });

      // Match con venue geo
      const VENUE = await PRISMA.venue.create({
        data: { name: 'Venue S35', latitude: -34.0, longitude: -58.0 },
        select: { id: true },
      });
      const COURT = await PRISMA.court.create({
        data: { venueId: VENUE.id, name: 'Court S35' },
        select: { id: true },
      });

      const ORG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s35-org-${TS}@test.local`, password: 'password123', name: 'Org S35' })
        .set('Content-Type', 'application/json');
      expect(ORG.status).toBe(201);
      const ORG_ID = ORG.body.data.user.id as string;

      const MATCH = await PRISMA.match.create({
        data: {
          sportId,
          categoryId,
          organizerUserId: ORG_ID,
          type: 'REGULAR',
          scheduledAt: new Date(Date.now() + 60_000),
          courtId: COURT.id,
        },
        select: { id: true },
      });

      await PRISMA.notificationEvent.create({
        data: {
          type: 'MATCH_SLOT_OPENED',
          matchId: MATCH.id,
          categoryId,
          payload: {},
        },
        select: { id: true },
      });

      const DISPATCH = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 1000, limitTokens: 1000 })
        .set('Content-Type', 'application/json');

      expect(DISPATCH.status).toBe(200);
      expect(DISPATCH.body.data.createdDeliveries).toBe(0);
    });
  },
);

