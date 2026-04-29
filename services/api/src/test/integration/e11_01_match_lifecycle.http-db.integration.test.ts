import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 11 — E2: Lifecycle match (leave/start/finish) (Integración HTTP + DB)', () => {
  let sportPadelId: string;
  let categoryId: string;

  const TOKENS: string[] = [];
  const USER_IDS: string[] = [];

  async function createUserSV(_label: string, _ts: number): Promise<{ token: string; userId: string }> {
    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e11-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);
    return { token: REG.body.data.accessToken as string, userId: REG.body.data.user.id as string };
  }

  async function createMatchSV(_token: string, _maxParticipants = 4): Promise<string> {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${_token}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: _maxParticipants })
      .set('Content-Type', 'application/json');
    expect(CREATE.status).toBe(201);
    return CREATE.body.data.id as string;
  }

  async function joinSV(_matchId: string, _token: string): Promise<void> {
    const JOIN = await request(APP).post(`/api/v1/matches/${_matchId}/join`).set('Authorization', `Bearer ${_token}`);
    expect(JOIN.status).toBe(200);
  }

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const TS = Date.now();
    const CAT = await PRISMA.category.create({ data: { name: 'Cat E11', slug: `e11-${TS}` } });
    categoryId = CAT.id;

    for (const _label of ['A', 'B', 'C', 'D', 'E']) {
      const U = await createUserSV(_label, TS);
      TOKENS.push(U.token);
      USER_IDS.push(U.userId);
      await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
    }
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('leave happy (user participante, match SCHEDULED) => 204 y reduce participantes', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await joinSV(MATCH_ID, TOKENS[1]);
    await joinSV(MATCH_ID, TOKENS[2]);
    await joinSV(MATCH_ID, TOKENS[3]);

    const BEFORE = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(BEFORE).toBe(4);

    const LEAVE = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/leave`)
      .set('Authorization', `Bearer ${TOKENS[1]}`);

    expect(LEAVE.status).toBe(204);

    const AFTER = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(AFTER).toBe(3);
  });

  it('leave no participant (match SCHEDULED) => 204 idempotente', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);

    const BEFORE = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(BEFORE).toBe(1);

    const LEAVE = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/leave`)
      .set('Authorization', `Bearer ${TOKENS[4]}`);

    expect(LEAVE.status).toBe(204);

    const AFTER = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(AFTER).toBe(1);
  });

  it('leave invalid state (IN_PROGRESS o FINISHED) => 409', async () => {
    const MATCH_IN_PROGRESS = await createMatchSV(TOKENS[0], 4);
    await PRISMA.match.update({ where: { id: MATCH_IN_PROGRESS }, data: { status: 'IN_PROGRESS' } });

    const LEAVE_IN_PROGRESS = await request(APP)
      .post(`/api/v1/matches/${MATCH_IN_PROGRESS}/leave`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(LEAVE_IN_PROGRESS.status).toBe(409);

    const MATCH_FINISHED = await createMatchSV(TOKENS[0], 4);
    await PRISMA.match.update({ where: { id: MATCH_FINISHED }, data: { status: 'FINISHED' } });

    const LEAVE_FINISHED = await request(APP)
      .post(`/api/v1/matches/${MATCH_FINISHED}/leave`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(LEAVE_FINISHED.status).toBe(409);
  });

  it('start happy (participante, SCHEDULED) => 204 y estado IN_PROGRESS', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);

    const START = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/start`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);

    expect(START.status).toBe(204);

    const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
    expect(MATCH?.status).toBe('IN_PROGRESS');
  });

  it('start no organizer (aunque sea participante) => 403', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await joinSV(MATCH_ID, TOKENS[4]);

    const START = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/start`)
      .set('Authorization', `Bearer ${TOKENS[4]}`);

    expect(START.status).toBe(403);
    expect(START.body.code).toBe('NO_AUTORIZADO');
  });

  it('start invalid state => 409', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await PRISMA.match.update({ where: { id: MATCH_ID }, data: { status: 'IN_PROGRESS' } });

    const START = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/start`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);

    expect(START.status).toBe(409);
  });

  it('finish happy (participante, IN_PROGRESS, 4 participantes) => 204 y estado FINISHED', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await joinSV(MATCH_ID, TOKENS[1]);
    await joinSV(MATCH_ID, TOKENS[2]);
    await joinSV(MATCH_ID, TOKENS[3]);

    const START = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/start`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(START.status).toBe(204);

    const FINISH = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/finish`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);

    expect(FINISH.status).toBe(204);

    const MATCH = await PRISMA.match.findUnique({ where: { id: MATCH_ID } });
    expect(MATCH?.status).toBe('FINISHED');
  });

  it('finish no organizer (aunque sea participante) => 403', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await joinSV(MATCH_ID, TOKENS[1]);
    await joinSV(MATCH_ID, TOKENS[2]);
    await joinSV(MATCH_ID, TOKENS[3]);

    const START = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/start`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(START.status).toBe(204);

    const FINISH = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/finish`)
      .set('Authorization', `Bearer ${TOKENS[1]}`);

    expect(FINISH.status).toBe(403);
    expect(FINISH.body.code).toBe('NO_AUTORIZADO');
  });

  it('finish not 4 participants => 409', async () => {
    const MATCH_ID = await createMatchSV(TOKENS[0], 4);
    await joinSV(MATCH_ID, TOKENS[1]);
    await joinSV(MATCH_ID, TOKENS[2]);

    await PRISMA.match.update({ where: { id: MATCH_ID }, data: { status: 'IN_PROGRESS' } });

    const FINISH = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/finish`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);

    expect(FINISH.status).toBe(409);
  });

  it('finish invalid state => 409', async () => {
    const MATCH_SCHEDULED = await createMatchSV(TOKENS[0], 4);
    const FINISH_SCHEDULED = await request(APP)
      .post(`/api/v1/matches/${MATCH_SCHEDULED}/finish`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(FINISH_SCHEDULED.status).toBe(409);

    const MATCH_FINISHED = await createMatchSV(TOKENS[0], 4);
    await PRISMA.match.update({ where: { id: MATCH_FINISHED }, data: { status: 'FINISHED' } });
    const FINISH_FINISHED = await request(APP)
      .post(`/api/v1/matches/${MATCH_FINISHED}/finish`)
      .set('Authorization', `Bearer ${TOKENS[0]}`);
    expect(FINISH_FINISHED.status).toBe(409);
  });
});

