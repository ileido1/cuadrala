import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 14 — E2: Notifications (MATCH_SLOT_OPENED → dispatch) (Integración HTTP + DB)',
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
        .send({ email: `e14-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
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
      const JOIN = await request(APP).post(`/api/v1/matches/${_matchId}/join`).set('Authorization', `Bearer ${_token}`);
      expect(JOIN.status).toBe(200);
    }

    async function countNotificationEventsSV(_matchId: string): Promise<number> {
      return PRISMA.notificationEvent.count({
        where: {
          type: 'MATCH_SLOT_OPENED',
          matchId: _matchId,
          categoryId,
        },
      });
    }

    async function countNotificationDeliveriesToSV(_userIds: string[]): Promise<number> {
      if (_userIds.length === 0) {
        return 0;
      }
      return PRISMA.notificationDelivery.count({
        where: {
          userId: { in: _userIds },
        },
      });
    }

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat E14', slug: `e14-${TS}` } });
      categoryId = CAT.id;

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Venue E14',
          latitude: 10.491,
          longitude: -66.903,
        },
      });
      const COURT = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'Court E14' } });
      courtId = COURT.id;

      // Participantes (4 = match lleno)
      for (const _label of ['P1', 'P2', 'P3', 'P4']) {
        const U = await createUserSV(_label, TS);
        TOKENS[_label] = U.token;
        USER_IDS[_label] = U.userId;
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
      }

      // No participantes (suscriptores potenciales)
      for (const _label of ['S_MATCH', 'S_FAR', 'S_DISABLED']) {
        const U = await createUserSV(_label, TS);
        TOKENS[_label] = U.token;
        USER_IDS[_label] = U.userId;
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
      }
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('leave (match lleno) => crea NotificationEvent MATCH_SLOT_OPENED; dispatch crea deliveries solo a elegibles y nunca a participantes', async () => {
      const MATCH_ID = await createMatchSV(TOKENS.P1!, 4);
      await joinSV(MATCH_ID, TOKENS.P2!);
      await joinSV(MATCH_ID, TOKENS.P3!);
      await joinSV(MATCH_ID, TOKENS.P4!);

      const LEAVE = await request(APP)
        .post(`/api/v1/matches/${MATCH_ID}/leave`)
        .set('Authorization', `Bearer ${TOKENS.P2!}`);
      expect(LEAVE.status).toBe(204);

      // 1) Se genera evento de notificación.
      const EVENT_COUNT = await countNotificationEventsSV(MATCH_ID);
      expect(EVENT_COUNT).toBe(1);

      // 2) Crear subscriptions:
      // - S_MATCH: matching geo + enabled
      // - S_FAR: no matching por geo
      // - S_DISABLED: disabled
      const SUB_MATCH = await request(APP)
        .post('/api/v1/users/me/notification-subscriptions')
        .set('Authorization', `Bearer ${TOKENS.S_MATCH!}`)
        .send({
          enabled: true,
          categoryId,
          nearLat: 10.491,
          nearLng: -66.903,
          radiusKm: 10,
        })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(SUB_MATCH.status);

      const SUB_FAR = await request(APP)
        .post('/api/v1/users/me/notification-subscriptions')
        .set('Authorization', `Bearer ${TOKENS.S_FAR!}`)
        .send({
          enabled: true,
          categoryId,
          nearLat: 0,
          nearLng: 0,
          radiusKm: 1,
        })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(SUB_FAR.status);

      const SUB_DISABLED = await request(APP)
        .post('/api/v1/users/me/notification-subscriptions')
        .set('Authorization', `Bearer ${TOKENS.S_DISABLED!}`)
        .send({
          enabled: false,
          categoryId,
          nearLat: 10.491,
          nearLng: -66.903,
          radiusKm: 10,
        })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(SUB_DISABLED.status);

      // 2b) Registrar token de dispositivo para S_MATCH (para envío real via provider)
      const DEVICE_TOKEN = await request(APP)
        .post('/api/v1/users/me/device-push-tokens')
        .set('Authorization', `Bearer ${TOKENS.S_MATCH!}`)
        .send({ token: `fcm-e14-${Date.now()}-aaaaaaaaaaaaaaaa`, enabled: true })
        .set('Content-Type', 'application/json');
      expect([200, 201]).toContain(DEVICE_TOKEN.status);

      // 3) Dispatch (endpoint internal protegido por secret)
      const DISPATCH = await request(APP)
        .post('/api/v1/notifications/dispatch')
        .set('x-dispatch-secret', DISPATCH_SECRET)
        .send({})
        .set('Content-Type', 'application/json');
      expect([200, 202, 204]).toContain(DISPATCH.status);

      // 4) Deliveries: solo S_MATCH y nunca participantes.
      const DELIVERIES_TO_PARTICIPANTS = await countNotificationDeliveriesToSV([
        USER_IDS.P1!,
        USER_IDS.P2!,
        USER_IDS.P3!,
        USER_IDS.P4!,
      ]);
      expect(DELIVERIES_TO_PARTICIPANTS).toBe(0);

      const DELIVERIES_TO_ELIGIBLES = await countNotificationDeliveriesToSV([USER_IDS.S_MATCH!]);
      expect(DELIVERIES_TO_ELIGIBLES).toBe(1);

      const DELIVERIES_TO_NON_ELIGIBLES = await countNotificationDeliveriesToSV([
        USER_IDS.S_FAR!,
        USER_IDS.S_DISABLED!,
      ]);
      expect(DELIVERIES_TO_NON_ELIGIBLES).toBe(0);
    });
  },
);

