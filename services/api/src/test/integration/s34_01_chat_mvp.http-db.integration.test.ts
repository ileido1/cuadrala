import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 34 — E7-01: Chat MVP (Integración HTTP + DB)', () => {
  let categoryId: string;
  let sportId: string;
  let presetId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();

    const CATALOG = await ensureTestCatalogSV();
    sportId = CATALOG.sportPadelId;
    presetId = CATALOG.presetAmericanoId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat S34', slug: `s34-${Date.now()}` },
      select: { id: true },
    });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('match chat: POST message y luego GET list devuelve el mensaje', async () => {
    const TS = Date.now();
    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `s34-${TS}@test.local`, password: 'password123', name: 'User S34' })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);
    const USER_ID = REG.body.data.user.id as string;
    const TOKEN = REG.body.data.accessToken as string;

    const MATCH = await PRISMA.match.create({
      data: {
        sportId,
        categoryId,
        organizerUserId: USER_ID,
        type: 'REGULAR',
        scheduledAt: new Date(Date.now() + 60_000),
      },
      select: { id: true },
    });

    const SEND = await request(APP)
      .post(`/api/v1/matches/${MATCH.id}/chat/messages`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ text: 'hola chat' })
      .set('Content-Type', 'application/json');
    expect(SEND.status).toBe(201);
    expect(SEND.body.data.threadId).toBeDefined();
    expect(SEND.body.data.message.text).toBe('hola chat');

    const LIST = await request(APP)
      .get(`/api/v1/matches/${MATCH.id}/chat/messages?limit=10`)
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(LIST.status).toBe(200);
    expect(LIST.body.data.threadId).toBe(SEND.body.data.threadId);
    const MESSAGES = LIST.body.data.messages as { text: string }[];
    expect(MESSAGES.some((_m) => _m.text === 'hola chat')).toBe(true);
  });

  it('tournament chat: POST message y luego GET list devuelve el mensaje', async () => {
    const TS = Date.now();
    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `s34t-${TS}@test.local`, password: 'password123', name: 'User S34T' })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);
    const TOKEN = REG.body.data.accessToken as string;

    const TOURNAMENT = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo S34',
        categoryId,
        sportId,
        formatPresetId: presetId,
      })
      .set('Content-Type', 'application/json');
    expect(TOURNAMENT.status).toBe(201);
    const TOURNAMENT_ID = TOURNAMENT.body.data.tournamentId as string;

    const SEND = await request(APP)
      .post(`/api/v1/tournaments/${TOURNAMENT_ID}/chat/messages`)
      .set('Authorization', `Bearer ${TOKEN}`)
      .send({ text: 'hola torneo' })
      .set('Content-Type', 'application/json');
    expect(SEND.status).toBe(201);

    const LIST = await request(APP)
      .get(`/api/v1/tournaments/${TOURNAMENT_ID}/chat/messages`)
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(LIST.status).toBe(200);
    const MESSAGES = LIST.body.data.messages as { text: string }[];
    expect(MESSAGES.some((_m) => _m.text === 'hola torneo')).toBe(true);
  });
});

