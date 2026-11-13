import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { loadVenuePricingCurrencySV, reservationMoneyCreateFieldsSV } from '../../infrastructure/prisma_money_fields.js';
import { UPDATE_MATCH_STATUS_UC } from '../../presentation/composition/matches.composition.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();
const MINUTE_MS = 60_000;

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Ciclo de vida de la partida por bloque de cancha (HTTP + DB)', () => {
  let sportPadelId: string;
  let categoryId: string;
  let venueId: string;
  let courtId: string;

  const TOKENS: string[] = [];
  const USER_IDS: string[] = [];

  /** Partida regular con los primeros `_participants` usuarios (el organizador es USER_IDS[0]). */
  async function createMatchSV(_data: {
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
    scheduledAt: Date | null;
    participants?: number;
    pricePerPlayerCents?: number;
    reservationMinutes?: number;
  }): Promise<string> {
    const MATCH = await PRISMA.match.create({
      data: {
        categoryId,
        sportId: sportPadelId,
        organizerUserId: USER_IDS[0]!,
        courtId,
        type: 'REGULAR',
        status: _data.status,
        scheduledAt: _data.scheduledAt,
        pricePerPlayerCents: _data.pricePerPlayerCents ?? 0,
        maxParticipants: 4,
      },
    });
    for (let i = 0; i < (_data.participants ?? 4); i++) {
      await PRISMA.matchParticipant.create({ data: { matchId: MATCH.id, userId: USER_IDS[i]! } });
    }
    if (_data.reservationMinutes !== undefined && _data.scheduledAt !== null) {
      const CURRENCY = await loadVenuePricingCurrencySV(PRISMA, venueId);
      await PRISMA.reservation.create({
        data: {
          venueId,
          courtId,
          sportId: sportPadelId,
          categoryId,
          type: 'MATCH',
          visibility: 'PUBLISHED',
          matchId: MATCH.id,
          matchStatus: _data.status,
          scheduledAt: _data.scheduledAt,
          durationMinutes: _data.reservationMinutes,
          createdByUserId: USER_IDS[0]!,
          organizerUserId: USER_IDS[0]!,
          status: 'CONFIRMED',
          ...reservationMoneyCreateFieldsSV(CURRENCY),
        },
      });
    }
    return MATCH.id;
  }

  function minutesAgo(_minutes: number): Date {
    return new Date(Date.now() - _minutes * MINUTE_MS);
  }

  async function eventsSV(_matchId: string, _type: 'MATCH_RESULT_REMINDER' | 'MATCH_CANCELLED') {
    return PRISMA.notificationEvent.findMany({
      where: { matchId: _matchId, type: _type },
      include: { deliveries: { select: { userId: true, status: true } } },
    });
  }

  const SCORES = (): Array<{ userId: string; points: number }> => [
    { userId: USER_IDS[0]!, points: 6 },
    { userId: USER_IDS[1]!, points: 6 },
    { userId: USER_IDS[2]!, points: 4 },
    { userId: USER_IDS[3]!, points: 4 },
  ];

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const TS = Date.now();
    const CAT = await createTestCategorySV(sportPadelId, `e22-${TS}`, 'Cat E22');
    categoryId = CAT.id;

    const VENUE = await PRISMA.venue.create({ data: { name: 'Venue E22', latitude: 10.5, longitude: -66.9 } });
    venueId = VENUE.id;
    const COURT = await PRISMA.court.create({ data: { name: 'Court E22', venueId } });
    courtId = COURT.id;

    for (const _label of ['A', 'B', 'C', 'D', 'E']) {
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `e22-${_label}-${TS}@test.local`, password: 'password123', name: `User ${_label}` })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      TOKENS.push(REG.body.data.accessToken as string);
      USER_IDS.push(REG.body.data.user.id as string);
    }
  });

  beforeEach(async () => {
    //? Cada caso corre el worker sobre toda la base: se arranca sin partidas previas.
    await PRISMA.notificationEvent.deleteMany({});
    await PRISMA.reservation.deleteMany({ where: { venueId } });
    await PRISMA.match.deleteMany({ where: { categoryId } });
    await PRISMA.notificationSubscription.deleteMany({});
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  describe('S2 — cargar el resultado termina la partida', () => {
    it('should finish an IN_PROGRESS match and store the draft when a participant proposes a result', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(30), reservationMinutes: 90 });

      const RES = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[1]!}`)
        .send({ scores: SCORES() })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH?.status).toBe('FINISHED');
      const RESERVATION = await PRISMA.reservation.findUnique({ where: { matchId: MATCH_ID } });
      expect(RESERVATION?.matchStatus).toBe('FINISHED');
      const DRAFTS = await PRISMA.matchResultDraft.findMany({ where: { matchId: MATCH_ID } });
      expect(DRAFTS).toHaveLength(1);
      expect(DRAFTS[0]!.proposedByUserId).toBe(USER_IDS[1]);
    });

    it('should leave an IN_PROGRESS match untouched when a non participant proposes a result', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(30) });

      const RES = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[4]!}`)
        .send({ scores: SCORES() })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);
      const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH?.status).toBe('IN_PROGRESS');
      expect(await PRISMA.matchResultDraft.count({ where: { matchId: MATCH_ID } })).toBe(0);
    });

    it('should reject a result saying the match has not started when it is SCHEDULED', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 60 * MINUTE_MS) });

      const RES = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[0]!}`)
        .send({ scores: SCORES() })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('PARTIDO_NO_INICIADO');
      expect(RES.body.message).toBe('La partida todavía no empezó.');
      expect(await PRISMA.matchResultDraft.count({ where: { matchId: MATCH_ID } })).toBe(0);
    });

    it('should reject a result saying the match was cancelled when it is CANCELLED', async () => {
      const MATCH_ID = await createMatchSV({ status: 'CANCELLED', scheduledAt: minutesAgo(30) });

      const RES = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[0]!}`)
        .send({ scores: SCORES() })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('PARTIDO_CANCELADO');
      expect(RES.body.message).toBe('La partida fue cancelada.');
    });

    it('should keep accepting a result for a FINISHED match', async () => {
      const MATCH_ID = await createMatchSV({ status: 'FINISHED', scheduledAt: minutesAgo(200) });

      const RES = await request(APP)
        .put(`/api/v1/matches/${MATCH_ID}/result-draft`)
        .set('Authorization', `Bearer ${TOKENS[2]!}`)
        .send({ scores: SCORES() })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH?.status).toBe('FINISHED');
    });
  });

  describe('S3/S4 — fin automático al terminar el bloque y recordatorio', () => {
    it('should finish at reservation block end and remind every participant once', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(61), reservationMinutes: 60 });

      const FIRST = await UPDATE_MATCH_STATUS_UC.execute();
      const SECOND = await UPDATE_MATCH_STATUS_UC.execute();

      expect(FIRST.finishedCount).toBe(1);
      expect(FIRST.remindedCount).toBe(1);
      expect(SECOND.finishedCount).toBe(0);
      const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH?.status).toBe('FINISHED');
      const RESERVATION = await PRISMA.reservation.findUnique({ where: { matchId: MATCH_ID } });
      expect(RESERVATION?.matchStatus).toBe('FINISHED');

      const EVENTS = await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER');
      expect(EVENTS).toHaveLength(1);
      expect(EVENTS[0]!.payload).toEqual({ kind: 'MATCH_RESULT_REMINDER', matchId: MATCH_ID });
      expect(EVENTS[0]!.categoryId).toBe(categoryId);
      expect(EVENTS[0]!.deliveries.map((_d) => _d.userId).sort()).toEqual(USER_IDS.slice(0, 4).sort());
      expect(EVENTS[0]!.deliveries.every((_d) => _d.status === 'PENDING')).toBe(true);
    });

    it('should not finish before the reservation block ends', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(80), reservationMinutes: 120 });

      const RESULT = await UPDATE_MATCH_STATUS_UC.execute();

      expect(RESULT.finishedCount).toBe(0);
      const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
      expect(MATCH?.status).toBe('IN_PROGRESS');
      expect(await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER')).toHaveLength(0);
    });

    it('should use a 90 minute block when the match has no reservation', async () => {
      const NOT_YET = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(80) });
      const DUE = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(91) });

      await UPDATE_MATCH_STATUS_UC.execute();

      expect((await PRISMA.match.findUnique({ where: { id: NOT_YET } }))?.status).toBe('IN_PROGRESS');
      expect((await PRISMA.match.findUnique({ where: { id: DUE } }))?.status).toBe('FINISHED');
    });

    it('should not touch an IN_PROGRESS match without scheduledAt', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: null });

      await UPDATE_MATCH_STATUS_UC.execute();

      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('IN_PROGRESS');
    });

    it('should not remind when the match already has a result draft', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(100) });
      await PRISMA.matchResultDraft.create({
        data: { matchId: MATCH_ID, version: 1, payload: { scores: SCORES() }, proposedByUserId: USER_IDS[0]! },
      });

      const RESULT = await UPDATE_MATCH_STATUS_UC.execute();

      expect(RESULT.finishedCount).toBe(1);
      expect(RESULT.remindedCount).toBe(0);
      expect(await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER')).toHaveLength(0);
    });

    it('should skip participants who disabled result reminders', async () => {
      await PRISMA.notificationSubscription.create({
        data: { userId: USER_IDS[3]!, enabled: true, enabledTypes: { MATCH_RESULT_REMINDER: false } },
      });
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(100) });

      await UPDATE_MATCH_STATUS_UC.execute();

      const EVENTS = await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER');
      expect(EVENTS).toHaveLength(1);
      expect(EVENTS[0]!.deliveries.map((_d) => _d.userId).sort()).toEqual(USER_IDS.slice(0, 3).sort());
    });

    it('should not remind twice when the worker runs concurrently', async () => {
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(100) });

      const RESULTS = await Promise.all([UPDATE_MATCH_STATUS_UC.execute(), UPDATE_MATCH_STATUS_UC.execute()]);

      expect(RESULTS.reduce((_sum, _r) => _sum + _r.finishedCount, 0)).toBe(1);
      expect(await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER')).toHaveLength(1);
    });
  });

  describe('S1/S5 — inicio por hora del bloque y aviso de cancelación', () => {
    it('should start a full free match at scheduledAt without notifying', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: minutesAgo(1), reservationMinutes: 90 });

      const RESULT = await UPDATE_MATCH_STATUS_UC.execute();

      expect(RESULT.updatedCount).toBe(1);
      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('IN_PROGRESS');
      expect((await PRISMA.reservation.findUnique({ where: { matchId: MATCH_ID } }))?.matchStatus).toBe('IN_PROGRESS');
      expect(await PRISMA.notificationEvent.count({ where: { matchId: MATCH_ID } })).toBe(0);
    });

    it('should not start a match before scheduledAt', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 10 * MINUTE_MS) });

      await UPDATE_MATCH_STATUS_UC.execute();

      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('SCHEDULED');
    });

    it('should cancel an incomplete match and tell every participant why, once', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: minutesAgo(1), participants: 3, reservationMinutes: 90 });

      const FIRST = await UPDATE_MATCH_STATUS_UC.execute();
      await UPDATE_MATCH_STATUS_UC.execute();

      expect(FIRST.cancelledCount).toBe(1);
      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('CANCELLED');
      expect((await PRISMA.reservation.findUnique({ where: { matchId: MATCH_ID } }))?.matchStatus).toBe('CANCELLED');
      const EVENTS = await eventsSV(MATCH_ID, 'MATCH_CANCELLED');
      expect(EVENTS).toHaveLength(1);
      expect(EVENTS[0]!.payload).toEqual({
        kind: 'MATCH_CANCELLED',
        matchId: MATCH_ID,
        cancelledByUserId: null,
        reason: 'INCOMPLETE',
      });
      expect(EVENTS[0]!.deliveries.map((_d) => _d.userId).sort()).toEqual(USER_IDS.slice(0, 3).sort());
    });

    it('should cancel a full unpaid match with reason UNPAID', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: minutesAgo(1), pricePerPlayerCents: 500 });

      await UPDATE_MATCH_STATUS_UC.execute();

      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('CANCELLED');
      const EVENTS = await eventsSV(MATCH_ID, 'MATCH_CANCELLED');
      expect(EVENTS).toHaveLength(1);
      expect((EVENTS[0]!.payload as Record<string, unknown>).reason).toBe('UNPAID');
      expect(EVENTS[0]!.deliveries).toHaveLength(4);
    });

    it('should show the reason in the in-app notification text', async () => {
      await createMatchSV({ status: 'SCHEDULED', scheduledAt: minutesAgo(1), participants: 2 });

      await UPDATE_MATCH_STATUS_UC.execute();

      const RES = await request(APP)
        .get('/api/v1/users/me/notifications?status=all')
        .set('Authorization', `Bearer ${TOKENS[1]!}`);
      expect(RES.status).toBe(200);
      const ITEMS = RES.body.data.items as Array<{ type: string; body: string }>;
      const CANCELLED = ITEMS.find((_i) => _i.type === 'MATCH_CANCELLED');
      expect(CANCELLED?.body).toBe('La partida se canceló porque no se completó a la hora de empezar.');
    });
  });

  describe('S6 — organizador en el detalle', () => {
    it('should expose organizerUserId on GET /matches/:id', async () => {
      const MATCH_ID = await createMatchSV({ status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 60 * MINUTE_MS) });

      const RES = await request(APP).get(`/api/v1/matches/${MATCH_ID}`);

      expect(RES.status).toBe(200);
      expect(RES.body.data.organizerUserId).toBe(USER_IDS[0]);
    });
  });
});
