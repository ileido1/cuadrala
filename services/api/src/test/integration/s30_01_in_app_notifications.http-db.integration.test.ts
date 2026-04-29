import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 30 — Notificaciones in-app (read/unread) (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;
    let userToken: string;
    let userId: string;
    let matchId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat S30', slug: `s30-${TS}` } });
      categoryId = CAT.id;

      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s30-${TS}@test.local`, password: 'password123', name: 'User S30' })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      userToken = REG.body.data.accessToken as string;
      userId = REG.body.data.user.id as string;

      matchId = (
        await PRISMA.match.create({
          data: {
            sportId: sportPadelId,
            categoryId,
            organizerUserId: userId,
            type: 'REGULAR',
            scheduledAt: new Date(Date.now() + 60_000),
          },
          select: { id: true },
        })
      ).id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('crear delivery → listar unread → marcar read → listar unread=0', async () => {
      const EVENT = await PRISMA.notificationEvent.create({
        data: {
          type: 'MATCH_SLOT_OPENED',
          matchId,
          categoryId,
          payload: { hello: 'world' },
        },
        select: { id: true },
      });

      const DELIVERY = await PRISMA.notificationDelivery.create({
        data: {
          eventId: EVENT.id,
          userId,
          status: 'SENT',
          error: null,
          sentAt: new Date(),
        },
        select: { id: true },
      });

      const LIST_UNREAD = await request(APP)
        .get('/api/v1/users/me/notifications?status=unread&page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);
      expect(LIST_UNREAD.status).toBe(200);
      expect(LIST_UNREAD.body.success).toBe(true);
      expect(LIST_UNREAD.body.data.items).toHaveLength(1);
      expect(LIST_UNREAD.body.data.items[0].deliveryId).toBe(DELIVERY.id);
      expect(LIST_UNREAD.body.data.items[0].readAt).toBeNull();

      const MARK_READ = await request(APP)
        .patch(`/api/v1/users/me/notifications/${DELIVERY.id}/read`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(MARK_READ.status).toBe(200);

      const LIST_UNREAD_2 = await request(APP)
        .get('/api/v1/users/me/notifications?status=unread&page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);
      expect(LIST_UNREAD_2.status).toBe(200);
      expect(LIST_UNREAD_2.body.data.items).toHaveLength(0);

      const LIST_ALL = await request(APP)
        .get('/api/v1/users/me/notifications?status=all&page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);
      expect(LIST_ALL.status).toBe(200);
      expect(LIST_ALL.body.data.items).toHaveLength(1);
      expect(LIST_ALL.body.data.items[0].readAt).not.toBeNull();
    });

    it('read-all marca todas las unread', async () => {
      const [EVENT_1, EVENT_2] = await Promise.all([
        PRISMA.notificationEvent.create({
          data: { type: 'MATCH_SLOT_OPENED', matchId, categoryId, payload: { n: 1 } },
          select: { id: true },
        }),
        PRISMA.notificationEvent.create({
          data: { type: 'MATCH_SLOT_OPENED', matchId, categoryId, payload: { n: 2 } },
          select: { id: true },
        }),
      ]);

      await PRISMA.notificationDelivery.createMany({
        data: [
          { eventId: EVENT_1.id, userId, status: 'SENT', error: null, sentAt: new Date(), readAt: null },
          { eventId: EVENT_2.id, userId, status: 'SENT', error: null, sentAt: new Date(), readAt: null },
        ],
        skipDuplicates: true,
      });

      const LIST_UNREAD = await request(APP)
        .get('/api/v1/users/me/notifications?status=unread&page=1&limit=50')
        .set('Authorization', `Bearer ${userToken}`);
      expect(LIST_UNREAD.status).toBe(200);
      expect(LIST_UNREAD.body.data.items.length).toBeGreaterThanOrEqual(2);

      const READ_ALL = await request(APP)
        .patch('/api/v1/users/me/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);
      expect(READ_ALL.status).toBe(200);
      expect(READ_ALL.body.data.updatedCount).toBeGreaterThanOrEqual(2);

      const LIST_UNREAD_2 = await request(APP)
        .get('/api/v1/users/me/notifications?status=unread&page=1&limit=50')
        .set('Authorization', `Bearer ${userToken}`);
      expect(LIST_UNREAD_2.status).toBe(200);
      expect(LIST_UNREAD_2.body.data.items).toHaveLength(0);
    });
  },
);

