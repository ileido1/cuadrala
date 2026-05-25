import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 36 — Notificaciones a participantes (chat, join)',
  () => {
    let sportId: string;
    let categoryId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      const CAT = await createTestCategorySV(sportId, `s36-${Date.now()}`, 'Cat S36');
      categoryId = CAT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('chat: mensaje crea delivery CHAT_MESSAGE para otro participante', async () => {
      const TS = Date.now();
      const REG_A = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s36a-${TS}@test.local`, password: 'password123', name: 'A' })
        .set('Content-Type', 'application/json');
      const REG_B = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s36b-${TS}@test.local`, password: 'password123', name: 'B' })
        .set('Content-Type', 'application/json');
      expect(REG_A.status).toBe(201);
      expect(REG_B.status).toBe(201);
      const USER_A = REG_A.body.data.user.id as string;
      const USER_B = REG_B.body.data.user.id as string;
      const TOKEN_A = REG_A.body.data.accessToken as string;

      const MATCH = await PRISMA.match.create({
        data: {
          sportId,
          categoryId,
          organizerUserId: USER_A,
          type: 'REGULAR',
          scheduledAt: new Date(Date.now() + 120_000),
          maxParticipants: 4,
        },
        select: { id: true },
      });

      await PRISMA.matchParticipant.createMany({
        data: [
          { matchId: MATCH.id, userId: USER_A },
          { matchId: MATCH.id, userId: USER_B },
        ],
      });

      const SEND = await request(APP)
        .post(`/api/v1/matches/${MATCH.id}/chat/messages`)
        .set('Authorization', `Bearer ${TOKEN_A}`)
        .send({ text: 'hola equipo' })
        .set('Content-Type', 'application/json');
      expect(SEND.status).toBe(201);

      const EVENT = await PRISMA.notificationEvent.findFirst({
        where: { matchId: MATCH.id, type: 'CHAT_MESSAGE' },
        orderBy: { createdAt: 'desc' },
      });
      expect(EVENT).not.toBeNull();

      const DELIVERY = await PRISMA.notificationDelivery.findFirst({
        where: { eventId: EVENT!.id, userId: USER_B },
      });
      expect(DELIVERY).not.toBeNull();
      expect(DELIVERY!.status).toBe('PENDING');
    });

    it('join: unirse crea delivery MATCH_PLAYER_JOINED para participantes existentes', async () => {
      const TS = Date.now();
      const REG_O = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s36o-${TS}@test.local`, password: 'password123', name: 'Org' })
        .set('Content-Type', 'application/json');
      const REG_J = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `s36j-${TS}@test.local`, password: 'password123', name: 'Join' })
        .set('Content-Type', 'application/json');
      expect(REG_O.status).toBe(201);
      expect(REG_J.status).toBe(201);
      const ORG_ID = REG_O.body.data.user.id as string;
      const JOINER_ID = REG_J.body.data.user.id as string;
      const TOKEN_J = REG_J.body.data.accessToken as string;

      await PRISMA.userSportCategory.createMany({
        data: [
          { userId: ORG_ID, sportId, categoryId },
          { userId: JOINER_ID, sportId, categoryId },
        ],
      });

      const MATCH = await PRISMA.match.create({
        data: {
          sportId,
          categoryId,
          organizerUserId: ORG_ID,
          type: 'REGULAR',
          scheduledAt: new Date(Date.now() + 120_000),
          maxParticipants: 4,
        },
        select: { id: true },
      });

      await PRISMA.matchParticipant.create({
        data: { matchId: MATCH.id, userId: ORG_ID },
      });

      const JOIN = await request(APP)
        .post(`/api/v1/matches/${MATCH.id}/join`)
        .set('Authorization', `Bearer ${TOKEN_J}`);
      expect(JOIN.status).toBe(200);

      const EVENT = await PRISMA.notificationEvent.findFirst({
        where: { matchId: MATCH.id, type: 'MATCH_PLAYER_JOINED' },
        orderBy: { createdAt: 'desc' },
      });
      expect(EVENT).not.toBeNull();

      const DELIVERY = await PRISMA.notificationDelivery.findFirst({
        where: { eventId: EVENT!.id, userId: ORG_ID },
      });
      expect(DELIVERY).not.toBeNull();
      expect(DELIVERY!.userId).not.toBe(JOINER_ID);
    });
  },
);
