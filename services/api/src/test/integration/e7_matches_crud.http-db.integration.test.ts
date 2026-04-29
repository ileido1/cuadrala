import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 7 — E2 hardening: Integración HTTP + DB (CRUD matches)', () => {
  let sportPadelId: string;
  let categoryId: string;

  let tokenA: string;
  let userAId: string;

  let tokenB: string;
  let userBId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const TS = Date.now();
    const CAT = await PRISMA.category.create({ data: { name: 'Cat E7', slug: `e7-${TS}` } });
    categoryId = CAT.id;

    const REG_A = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e7-a-${TS}@test.local`, password: 'password123', name: 'User A' })
      .set('Content-Type', 'application/json');
    expect(REG_A.status).toBe(201);
    tokenA = REG_A.body.data.accessToken as string;
    userAId = REG_A.body.data.user.id as string;

    const REG_B = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e7-b-${TS}@test.local`, password: 'password123', name: 'User B' })
      .set('Content-Type', 'application/json');
    expect(REG_B.status).toBe(201);
    tokenB = REG_B.body.data.accessToken as string;
    userBId = REG_B.body.data.user.id as string;

    // Categoría para permitir join/validaciones donde aplique.
    await PRISMA.userCategory.create({ data: { userId: userAId, categoryId } });
    await PRISMA.userCategory.create({ data: { userId: userBId, categoryId } });
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('create → update → cancel (happy path)', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sportId: sportPadelId,
        categoryId,
        type: 'REGULAR',
        maxParticipants: 4,
      })
      .set('Content-Type', 'application/json');

    expect(CREATE.status).toBe(201);
    expect(CREATE.body.success).toBe(true);
    expect(CREATE.body.data.status).toBe('SCHEDULED');
    expect(CREATE.body.data.participantCount).toBe(1);

    const MATCH_ID = CREATE.body.data.id as string;

    const UPDATE = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ maxParticipants: 5 })
      .set('Content-Type', 'application/json');

    expect(UPDATE.status).toBe(200);
    expect(UPDATE.body.success).toBe(true);
    expect(UPDATE.body.data.maxParticipants).toBe(5);

    const CANCEL = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(CANCEL.status).toBe(200);
    expect(CANCEL.body.success).toBe(true);
    expect(CANCEL.body.data.status).toBe('CANCELLED');
  });

  it('update/cancel responde 403 si el usuario no es participante', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
      .set('Content-Type', 'application/json');
    const MATCH_ID = CREATE.body.data.id as string;

    // Usuario B NO es organizer (aunque participe).
    const JOIN = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/join`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(JOIN.status).toBe(200);

    const UPDATE = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ maxParticipants: 6 })
      .set('Content-Type', 'application/json');

    expect(UPDATE.status).toBe(403);
    expect(UPDATE.body.code).toBe('NO_AUTORIZADO');

    const CANCEL = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(CANCEL.status).toBe(403);
    expect(CANCEL.body.code).toBe('NO_AUTORIZADO');
  });

  it('conflicto 409 si status != SCHEDULED (update) y si status es FINISHED (cancel)', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
      .set('Content-Type', 'application/json');
    const MATCH_ID = CREATE.body.data.id as string;

    await PRISMA.match.update({ where: { id: MATCH_ID }, data: { status: 'IN_PROGRESS' } });

    const UPDATE = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ maxParticipants: 6 })
      .set('Content-Type', 'application/json');

    expect(UPDATE.status).toBe(409);
    expect(UPDATE.body.code).toBe('PARTIDO_NO_EDITABLE');

    // Cancel en IN_PROGRESS ahora está permitido (organizer). Para validar conflicto, usamos FINISHED.
    await PRISMA.match.update({ where: { id: MATCH_ID }, data: { status: 'FINISHED' } });

    const CANCEL = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(CANCEL.status).toBe(409);
    expect(CANCEL.body.code).toBe('PARTIDO_NO_CANCELABLE');
  });

  it('conflicto 409 si maxParticipants < participantCount', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
      .set('Content-Type', 'application/json');
    const MATCH_ID = CREATE.body.data.id as string;

    // A es participante por creación; B puede unirse (tiene UserCategory).
    const JOIN = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/join`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(JOIN.status).toBe(200);

    const TS = Date.now();
    const REG_C = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e7-c-${TS}@test.local`, password: 'password123', name: 'User C' })
      .set('Content-Type', 'application/json');
    expect(REG_C.status).toBe(201);
    const tokenC = REG_C.body.data.accessToken as string;
    const userCId = REG_C.body.data.user.id as string;
    await PRISMA.userCategory.create({ data: { userId: userCId, categoryId } });

    const JOIN_C = await request(APP)
      .post(`/api/v1/matches/${MATCH_ID}/join`)
      .set('Authorization', `Bearer ${tokenC}`);
    expect(JOIN_C.status).toBe(200);

    const UPDATE = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ maxParticipants: 2 })
      .set('Content-Type', 'application/json');

    expect(UPDATE.status).toBe(409);
    expect(UPDATE.body.code).toBe('CUPO_INVALIDO');
  });

  it('validación 400 si update no incluye campos', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
      .set('Content-Type', 'application/json');
    const MATCH_ID = CREATE.body.data.id as string;

    const UPDATE = await request(APP)
      .patch(`/api/v1/matches/${MATCH_ID}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({})
      .set('Content-Type', 'application/json');

    expect(UPDATE.status).toBe(400);
    expect(UPDATE.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('smoke: GET list y GET by id reflejan el estado cancelado', async () => {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: 4 })
      .set('Content-Type', 'application/json');
    const MATCH_ID = CREATE.body.data.id as string;

    await request(APP).patch(`/api/v1/matches/${MATCH_ID}/cancel`).set('Authorization', `Bearer ${tokenA}`);

    const DETAIL = await request(APP).get(`/api/v1/matches/${MATCH_ID}`);
    expect(DETAIL.status).toBe(200);
    expect(DETAIL.body.data.status).toBe('CANCELLED');

    const LIST = await request(APP).get('/api/v1/matches?status=CANCELLED');
    expect(LIST.status).toBe(200);
    expect(Array.isArray(LIST.body.data.items)).toBe(true);

    const IDS = (LIST.body.data.items as Array<{ id: string }>).map((_m) => _m.id);
    expect(IDS).toContain(MATCH_ID);
  });
});

