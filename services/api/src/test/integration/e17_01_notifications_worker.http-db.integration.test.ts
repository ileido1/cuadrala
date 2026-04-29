import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 17 — Notifications como worker real (Integración HTTP + DB)',
  () => {
    let sportPadelId: string;
    let categoryId: string;
    let courtId: string;

    const TOKENS: Record<string, string> = {};
    const USER_IDS: Record<string, string> = {};

    const DISPATCH_SECRET =
      process.env.NOTIFICATIONS_DISPATCH_SECRET ??
      'dev-only-notifications-dispatch-secret-min-32!!';

    async function createUserSV(_label: string, _ts: number): Promise<{ token: string; userId: string }> {
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `e17-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
        .set('Content-Type', 'application/json');

      expect(REG.status).toBe(201);
      return { token: REG.body.data.accessToken as string, userId: REG.body.data.user.id as string };
    }

    async function createMatchSV(_token: string, _maxParticipants = 4): Promise<string> {
      const CREATE = await request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${_token}`)
        .send({
          sportId: sportPadelId,
          categoryId,
          type: 'REGULAR',
          courtId,
          scheduledAt: new Date(Date.now() + 60_000).toISOString(),
          maxParticipants: _maxParticipants,
        })
        .set('Content-Type', 'application/json');

      expect(CREATE.status).toBe(201);
      return CREATE.body.data.id as string;
    }

    async function joinSV(_matchId: string, _token: string): Promise<void> {
      const JOIN = await request(APP)
        .post(`/api/v1/matches/${_matchId}/join`)
        .set('Authorization', `Bearer ${_token}`);
      expect(JOIN.status).toBe(200);
    }

    async function createMatchingSubscriptionSV(_token: string): Promise<void> {
      const SUB = await request(APP)
        .post('/api/v1/users/me/notification-subscriptions')
        .set('Authorization', `Bearer ${_token}`)
        .send({
          enabled: true,
          categoryId,
          nearLat: 10.491,
          nearLng: -66.903,
          radiusKm: 10,
        })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(SUB.status);
    }

    async function registerDeviceTokenSV(_token: string, _deviceToken: string): Promise<void> {
      const DEVICE_TOKEN = await request(APP)
        .post('/api/v1/users/me/device-push-tokens')
        .set('Authorization', `Bearer ${_token}`)
        .send({ token: _deviceToken, enabled: true })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(DEVICE_TOKEN.status);
    }

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E17', slug: `e17-${TS}` } });
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Venue E17',
          latitude: 10.491,
          longitude: -66.903,
        },
      });
      const COURT = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'Court E17' } });
      courtId = COURT.id;

      // Participantes (4 = match lleno)
      for (const _label of ['P1', 'P2', 'P3', 'P4']) {
        const U = await createUserSV(_label, TS);
        TOKENS[_label] = U.token;
        USER_IDS[_label] = U.userId;
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
      }

      // Suscriptores elegibles
      for (const _label of ['S_OK', 'S_FAIL', 'S_INVALID']) {
        const U = await createUserSV(_label, TS);
        TOKENS[_label] = U.token;
        USER_IDS[_label] = U.userId;
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
        await createMatchingSubscriptionSV(U.token);
      }

      await registerDeviceTokenSV(TOKENS.S_OK!, `fcm-e17-${Date.now()}-aaaaaaaaaaaaaaaa`);
      await registerDeviceTokenSV(TOKENS.S_FAIL!, `fcm-test-fail-${Date.now()}-bbbbbbbbbbbbbbbb`);
      await registerDeviceTokenSV(TOKENS.S_INVALID!, `fcm-test-invalid-${Date.now()}-cccccccccccccccc`);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('dispatch worker: crea deliveries PENDING idempotente, envia por lote, aplica retry/backoff y deshabilita token inválido', async () => {
      const MATCH_ID = await createMatchSV(TOKENS.P1!, 4);
      await joinSV(MATCH_ID, TOKENS.P2!);
      await joinSV(MATCH_ID, TOKENS.P3!);
      await joinSV(MATCH_ID, TOKENS.P4!);

      const LEAVE = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/leave`)
        .set('Authorization', `Bearer ${TOKENS.P2!}`);
      expect(LEAVE.status).toBe(204);

      const EVENT = await PRISMA.notificationEvent.findFirst({
        where: { matchId: MATCH_ID, categoryId, processedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      expect(EVENT).not.toBeNull();

      // 1) Primer dispatch: S_OK -> SENT; S_FAIL -> FAILED con nextAttemptAt; S_INVALID -> FAILED sin retry y token deshabilitado
      const DISPATCH_1 = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 50 })
        .set('Content-Type', 'application/json');
      expect([200, 202, 204]).toContain(DISPATCH_1.status);

      const DELIVERIES = await PRISMA.notificationDelivery.findMany({
        where: { eventId: EVENT!.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(DELIVERIES.length).toBe(3);

      const D_OK = DELIVERIES.find((_d) => _d.userId === USER_IDS.S_OK!);
      const D_FAIL = DELIVERIES.find((_d) => _d.userId === USER_IDS.S_FAIL!);
      const D_INVALID = DELIVERIES.find((_d) => _d.userId === USER_IDS.S_INVALID!);

      expect(D_OK?.status).toBe('SENT');
      expect(D_OK?.sentAt).not.toBeNull();

      expect(D_FAIL?.status).toBe('FAILED');
      expect(D_FAIL?.attemptCount).toBe(1);
      expect(D_FAIL?.nextAttemptAt).not.toBeNull();

      expect(D_INVALID?.status).toBe('FAILED');
      expect(D_INVALID?.nextAttemptAt).toBeNull();

      const INVALID_TOKEN_ROW = await PRISMA.devicePushToken.findFirst({
        where: { userId: USER_IDS.S_INVALID!, enabled: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(INVALID_TOKEN_ROW).not.toBeNull();

      const EVENT_AFTER_1 = await PRISMA.notificationEvent.findUnique({ where: { id: EVENT!.id } });
      expect(EVENT_AFTER_1?.processedAt).toBeNull();

      // 2) Forzar el retry "due" al máximo intento para que el evento se pueda procesar en el segundo dispatch.
      await PRISMA.notificationDelivery.updateMany({
        where: { id: D_FAIL!.id },
        data: { attemptCount: 4, nextAttemptAt: new Date(Date.now() - 1000) },
      });

      const DISPATCH_2 = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 50 })
        .set('Content-Type', 'application/json');
      expect([200, 202, 204]).toContain(DISPATCH_2.status);

      const D_FAIL_AFTER = await PRISMA.notificationDelivery.findUnique({ where: { id: D_FAIL!.id } });
      expect(D_FAIL_AFTER?.status).toBe('FAILED');
      expect(D_FAIL_AFTER?.attemptCount).toBe(5);
      expect(D_FAIL_AFTER?.nextAttemptAt).toBeNull();

      const EVENT_AFTER_2 = await PRISMA.notificationEvent.findUnique({ where: { id: EVENT!.id } });
      expect(EVENT_AFTER_2?.processedAt).not.toBeNull();
    });
  },
);

