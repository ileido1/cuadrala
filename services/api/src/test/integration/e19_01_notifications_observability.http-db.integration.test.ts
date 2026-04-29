import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { NOTIFICATIONS_METRICS } from '../../presentation/observability/notifications_metrics.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 19 — Observability/hardening worker notificaciones (Integración HTTP + DB)',
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
        .send({ email: `e19-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
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
      NOTIFICATIONS_METRICS.resetSV();
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E19', slug: `e19-${TS}` } });
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Venue E19',
          latitude: 10.491,
          longitude: -66.903,
        },
      });
      const COURT = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'Court E19' } });
      courtId = COURT.id;

      // Participantes (4 = match lleno)
      for (const _label of ['P1', 'P2', 'P3', 'P4']) {
        const U = await createUserSV(_label, TS);
        TOKENS[_label] = U.token;
        USER_IDS[_label] = U.userId;
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
      }
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('GET /api/v1/notifications/metrics responde y refleja contadores tras dispatch', async () => {
      const TS = Date.now();
      const SUB = await createUserSV('S_OK', TS);
      TOKENS.S_OK = SUB.token;
      USER_IDS.S_OK = SUB.userId;
      await PRISMA.userCategory.create({ data: { userId: SUB.userId, categoryId } });
      await createMatchingSubscriptionSV(SUB.token);
      await registerDeviceTokenSV(SUB.token, `fcm-e19-${Date.now()}-aaaaaaaaaaaaaaaa`);

      const MATCH_ID = await createMatchSV(TOKENS.P1!, 4);
      await joinSV(MATCH_ID, TOKENS.P2!);
      await joinSV(MATCH_ID, TOKENS.P3!);
      await joinSV(MATCH_ID, TOKENS.P4!);

      const LEAVE = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/leave`)
        .set('Authorization', `Bearer ${TOKENS.P2!}`);
      expect(LEAVE.status).toBe(204);

      const DISPATCH = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 50 })
        .set('Content-Type', 'application/json');
      expect(DISPATCH.status).toBe(200);

      const METRICS = await request(APP)
        .get('/api/v1/notifications/metrics')
        .set('x-dispatch-secret', DISPATCH_SECRET);
      expect(METRICS.status).toBe(200);
      expect(METRICS.body?.data?.eventsProcessed).toBeGreaterThanOrEqual(0);
      expect(METRICS.body?.data?.deliveriesSent).toBeGreaterThanOrEqual(1);
      expect(METRICS.body?.data?.lastTickAt).not.toBeNull();
    });

    it('cuando falla el envío, incrementa métricas y loggea errorCode estructurado', async () => {
      NOTIFICATIONS_METRICS.resetSV();
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const TS = Date.now();
      const SUB = await createUserSV('S_FAIL', TS);
      await PRISMA.userCategory.create({ data: { userId: SUB.userId, categoryId } });
      await createMatchingSubscriptionSV(SUB.token);
      await registerDeviceTokenSV(SUB.token, `fcm-test-fail-${Date.now()}-bbbbbbbbbbbbbbbb`);

      const MATCH_ID = await createMatchSV(TOKENS.P1!, 4);
      await joinSV(MATCH_ID, TOKENS.P2!);
      await joinSV(MATCH_ID, TOKENS.P3!);
      await joinSV(MATCH_ID, TOKENS.P4!);

      const LEAVE = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/leave`)
        .set('Authorization', `Bearer ${TOKENS.P2!}`);
      expect(LEAVE.status).toBe(204);

      const DISPATCH = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 50 })
        .set('Content-Type', 'application/json');
      expect(DISPATCH.status).toBe(200);

      const SNAP = NOTIFICATIONS_METRICS.snapshotSV();
      expect(SNAP.deliveriesFailed).toBeGreaterThanOrEqual(1);

      const LOG_LINES = logSpy.mock.calls.map((_c) => String(_c[0] ?? ''));
      const HAS_ERROR_CODE = LOG_LINES.some((_l) => {
        try {
          const OBJ = JSON.parse(_l) as { kind?: string; errorCode?: string };
          return OBJ.kind === 'notifications.dispatch.delivery' && OBJ.errorCode === 'messaging/internal-error';
        } catch {
          return false;
        }
      });
      expect(HAS_ERROR_CODE).toBe(true);

      logSpy.mockRestore();
    });

    it('rate limit por tokens corta procesamiento del tick', async () => {
      NOTIFICATIONS_METRICS.resetSV();
      const TS = Date.now();

      const SUBS: Array<{ token: string; userId: string; deviceToken: string }> = [];
      for (const _i of [1, 2, 3]) {
        const U = await createUserSV(`S_RL_${_i}`, TS);
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
        await createMatchingSubscriptionSV(U.token);
        const DEVICE = `fcm-e19-rl-${TS}-${_i}-aaaaaaaaaaaaaaaa`;
        await registerDeviceTokenSV(U.token, DEVICE);
        SUBS.push({ token: U.token, userId: U.userId, deviceToken: DEVICE });
      }

      const MATCH_ID = await createMatchSV(TOKENS.P1!, 4);
      await joinSV(MATCH_ID, TOKENS.P2!);
      await joinSV(MATCH_ID, TOKENS.P3!);
      await joinSV(MATCH_ID, TOKENS.P4!);

      const LEAVE = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/leave`)
        .set('Authorization', `Bearer ${TOKENS.P2!}`);
      expect(LEAVE.status).toBe(204);

      const DISPATCH = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({ limitEvents: 10, limitDeliveries: 50, limitTokens: 1 })
        .set('Content-Type', 'application/json');
      expect(DISPATCH.status).toBe(200);
      expect(DISPATCH.body?.data?.attemptedDeliveries).toBe(1);

      const EVENT = await PRISMA.notificationEvent.findFirst({
        where: { matchId: MATCH_ID, categoryId },
        orderBy: { createdAt: 'desc' },
      });
      expect(EVENT).not.toBeNull();

      const PENDING = await PRISMA.notificationDelivery.count({
        where: { eventId: EVENT!.id, status: 'PENDING' },
      });
      expect(PENDING).toBeGreaterThanOrEqual(1);
    });
  },
);

