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

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Ciclo de vida por bloque — carreras y bordes (HTTP + DB)', () => {
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

  //? Pruebas del verificador independiente (odd/tasks/match-lifecycle-by-block.md, T3).
  describe('verifier probes', () => {
    it('P1 atomic: draft insert failure leaves match and reservation IN_PROGRESS', async () => {
      const { PrismaMatchResultDraftRepository } = await import('../../infrastructure/adapters/prisma_match_result_draft_repository.js');
      const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(30), reservationMinutes: 90 });
      await PRISMA.matchResultDraft.create({ data: { matchId: MATCH_ID, version: 1, status: 'DRAFT', payload: {}, proposedByUserId: USER_IDS[0]! } });
      const REPO = new PrismaMatchResultDraftRepository();
      await expect(REPO.createDraftSV({ matchId: MATCH_ID, version: 1, payload: {}, proposedByUserId: USER_IDS[1]!, finishInProgressMatch: true })).rejects.toBeTruthy();
      expect((await PRISMA.match.findUnique({ where: { id: MATCH_ID } }))?.status).toBe('IN_PROGRESS');
      expect((await PRISMA.reservation.findFirst({ where: { matchId: MATCH_ID } }))?.matchStatus).toBe('IN_PROGRESS');
      expect(await PRISMA.matchResultDraft.count({ where: { matchId: MATCH_ID } })).toBe(1);
    });

    it('P2 tournament IN_PROGRESS match still requires FINISHED and is untouched by the worker', async () => {
      const CATALOG = await ensureTestCatalogSV();
      const T = await PRISMA.tournament.create({ data: { name: `T probe ${Date.now()}`, categoryId, sportId: sportPadelId, formatPresetId: CATALOG.presetAmericanoId, organizerUserId: USER_IDS[0]!, status: 'IN_PROGRESS' } });
      const M = await PRISMA.match.create({ data: { categoryId, sportId: sportPadelId, organizerUserId: USER_IDS[0]!, courtId, type: 'REGULAR', status: 'IN_PROGRESS', scheduledAt: minutesAgo(600), pricePerPlayerCents: 0, maxParticipants: 4, tournamentId: T.id } });
      for (let i = 0; i < 4; i++) await PRISMA.matchParticipant.create({ data: { matchId: M.id, userId: USER_IDS[i]! } });
      const RES = await request(APP).put(`/api/v1/matches/${M.id}/result-draft`).set('Authorization', `Bearer ${TOKENS[1]!}`).send({ scores: SCORES() }).set('Content-Type', 'application/json');
      console.log('P2 status', RES.status, JSON.stringify(RES.body).slice(0, 200));
      expect(RES.status).toBe(409);
      expect(JSON.stringify(RES.body)).toContain('PARTIDO_NO_FINALIZADO');
      await UPDATE_MATCH_STATUS_UC.execute();
      expect((await PRISMA.match.findUnique({ where: { id: M.id } }))?.status).toBe('IN_PROGRESS');
      expect(await PRISMA.notificationEvent.count({ where: { matchId: M.id } })).toBe(0);
      await PRISMA.match.delete({ where: { id: M.id } });
      await PRISMA.tournament.delete({ where: { id: T.id } });
    });

    it('P3 race: participant proposes while worker finishes at block end (x8)', async () => {
      for (let k = 0; k < 8; k++) {
        await PRISMA.notificationEvent.deleteMany({});
        const MATCH_ID = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(91), reservationMinutes: 90 });
        const [W, H] = await Promise.all([
          UPDATE_MATCH_STATUS_UC.execute(),
          request(APP).put(`/api/v1/matches/${MATCH_ID}/result-draft`).set('Authorization', `Bearer ${TOKENS[1]!}`).send({ scores: SCORES() }).set('Content-Type', 'application/json'),
        ]);
        const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
        const RESV = await PRISMA.reservation.findFirst({ where: { matchId: MATCH_ID } });
        const DRAFTS = await PRISMA.matchResultDraft.count({ where: { matchId: MATCH_ID } });
        const EV = await eventsSV(MATCH_ID, 'MATCH_RESULT_REMINDER');
        console.log(`P3 k=${k} http=${H.status} finished=${W.finishedCount} reminded=${W.remindedCount} fails=${W.notificationFailures} match=${MATCH?.status} resv=${RESV?.matchStatus} drafts=${DRAFTS} reminderEvents=${EV.length}`);
        expect(H.status).toBe(201);
        expect(MATCH?.status).toBe('FINISHED');
        expect(RESV?.matchStatus).toBe('FINISHED');
        expect(DRAFTS).toBe(1);
        expect(EV.length).toBeLessThanOrEqual(1);
        if (W.finishedCount === 0) expect(EV.length).toBe(0);
        await PRISMA.match.delete({ where: { id: MATCH_ID } });
      }
    });

    it('P4 concurrent ticks: cancel and reminder notifications exactly once', async () => {
      const A = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(200), reservationMinutes: 60 });
      const B = await createMatchSV({ status: 'SCHEDULED', scheduledAt: minutesAgo(1), participants: 2, reservationMinutes: 60 });
      const R = await Promise.all(Array.from({ length: 5 }, () => UPDATE_MATCH_STATUS_UC.execute()));
      console.log('P4', JSON.stringify(R));
      const EA = await eventsSV(A, 'MATCH_RESULT_REMINDER');
      const EB = await eventsSV(B, 'MATCH_CANCELLED');
      expect(EA.length).toBe(1);
      expect(EA[0]!.deliveries.length).toBe(4);
      expect(EB.length).toBe(1);
      expect(EB[0]!.deliveries.length).toBe(2);
      expect((EB[0]!.payload as Record<string, unknown>).reason).toBe('INCOMPLETE');
      expect((await PRISMA.reservation.findFirst({ where: { matchId: B } }))?.matchStatus).toBe('CANCELLED');
      expect((await PRISMA.reservation.findFirst({ where: { matchId: A } }))?.matchStatus).toBe('FINISHED');
    });

    it('P5 boundary: block end exactly at 60 min with reservation; 89 min without reservation not finished', async () => {
      const A = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(59), reservationMinutes: 60 });
      const B = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(89) });
      const C = await createMatchSV({ status: 'IN_PROGRESS', scheduledAt: minutesAgo(91) });
      await UPDATE_MATCH_STATUS_UC.execute();
      const S = async (_id: string) => (await PRISMA.match.findUnique({ where: { id: _id } }))?.status;
      expect(await S(A)).toBe('IN_PROGRESS');
      expect(await S(B)).toBe('IN_PROGRESS');
      expect(await S(C)).toBe('FINISHED');
    });

    it('P6 GET detail exposes organizerUserId = organizer, not first participant', async () => {
      const M = await PRISMA.match.create({ data: { categoryId, sportId: sportPadelId, organizerUserId: USER_IDS[3]!, courtId, type: 'REGULAR', status: 'SCHEDULED', scheduledAt: new Date(Date.now() + 3600_000), pricePerPlayerCents: 0, maxParticipants: 4 } });
      await PRISMA.matchParticipant.create({ data: { matchId: M.id, userId: USER_IDS[0]! } });
      const RES = await request(APP).get(`/api/v1/matches/${M.id}`).set('Authorization', `Bearer ${TOKENS[0]!}`);
      expect(RES.status).toBe(200);
      expect(RES.body.data.organizerUserId).toBe(USER_IDS[3]);
    });
  });
});
