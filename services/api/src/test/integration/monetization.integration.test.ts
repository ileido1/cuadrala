import { Prisma } from '../../generated/prisma/client.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Integración monetización (obligaciones + fee + suscripción)',
  () => {
    let categoryId: string;
    let userA: string;
    let userB: string;
    let matchId: string;
    let txAId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      await ensureTestCatalogSV();
      const SLUG = `mon-cat-${Date.now()}`;
      const CAT = await PRISMA.category.create({
        data: { name: 'Cat monet', slug: SLUG },
      });
      categoryId = CAT.id;

      const TS = Date.now();
      const U1 = await PRISMA.user.create({
        data: { email: `ma-${TS}@test.local`, name: 'A' },
      });
      const U2 = await PRISMA.user.create({
        data: { email: `mb-${TS}@test.local`, name: 'B' },
      });
      userA = U1.id;
      userB = U2.id;

      await PRISMA.feeRule.create({
        data: {
          scope: 'MATCH',
          type: 'FIXED',
          value: new Prisma.Decimal('1.0000'),
          isActive: true,
        },
      });

      const CREATE = await request(APP)
        .post('/api/v1/americanos')
        .send({
          categoryId,
          participantUserIds: [userA, userB],
        })
        .set('Content-Type', 'application/json');

      expect(CREATE.status).toBe(201);
      matchId = CREATE.body.data.matchId as string;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('POST create-obligations genera dos filas con fee', async () => {
      const RES = await request(APP)
        .post(`/api/v1/matches/${matchId}/transactions/create-obligations`)
        .send({ amountBasePerPerson: 10 })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.created).toHaveLength(2);
      expect(RES.body.data.skipped).toHaveLength(0);
      const IDS = RES.body.data.created.map((_c: { userId: string }) => _c.userId);
      expect(IDS).toContain(userA);
      expect(IDS).toContain(userB);

      const ROW_A = RES.body.data.created.find((_c: { userId: string }) => _c.userId === userA);
      expect(Number(ROW_A.amountBase)).toBe(10);
      expect(Number(ROW_A.feeAmount)).toBe(1);
      expect(Number(ROW_A.amountTotal)).toBe(11);
      txAId = ROW_A.id as string;
    });

    it('GET /users/:userId/transactions lista obligaciones del usuario', async () => {
      const RES = await request(APP).get(`/api/v1/users/${userA}/transactions?limit=10`);

      expect(RES.status).toBe(200);
      expect(RES.body.data.userId).toBe(userA);
      expect(RES.body.data.transactions).toHaveLength(1);
      expect(RES.body.data.transactions[0].matchId).toBe(matchId);
    });

    it('GET /users/:userId/transactions responde 404 si el usuario no existe', async () => {
      const RES = await request(APP).get(
        '/api/v1/users/550e8400-e29b-41d4-a716-446655440099/transactions',
      );

      expect(RES.status).toBe(404);
      expect(RES.body.code).toBe('USUARIO_NO_ENCONTRADO');
    });

    it('GET summary refleja totales y conteos', async () => {
      const RES = await request(APP).get(`/api/v1/matches/${matchId}/transactions/summary`);

      expect(RES.status).toBe(200);
      expect(RES.body.data.matchId).toBe(matchId);
      expect(RES.body.data.transactionCount).toBe(2);
      expect(Number(RES.body.data.totalAmountBase)).toBe(20);
      expect(Number(RES.body.data.totalFeeAmount)).toBe(2);
      expect(Number(RES.body.data.totalAmount)).toBe(22);
      expect(RES.body.data.pendingCount).toBe(2);
      expect(RES.body.data.confirmedCount).toBe(0);
      expect(RES.body.data.cancelledCount).toBe(0);
    });

    it('PATCH confirm-manual confirma una transacción', async () => {
      const RES = await request(APP).patch(`/api/v1/transactions/${txAId}/confirm-manual`);

      expect(RES.status).toBe(200);
      expect(RES.body.data.status).toBe('CONFIRMED');
    });

    it('POST create-obligations omite participantes con obligación activa', async () => {
      const RES = await request(APP)
        .post(`/api/v1/matches/${matchId}/transactions/create-obligations`)
        .send({ amountBasePerPerson: 5 })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.created).toHaveLength(0);
      expect(RES.body.data.skipped).toHaveLength(2);
      expect(RES.body.data.skipped[0].reason).toBe('ALREADY_HAS_ACTIVE_OBLIGATION');
    });

    it('PATCH subscription actualiza a PRO', async () => {
      const RES = await request(APP)
        .patch(`/api/v1/users/${userB}/subscription`)
        .send({ subscriptionType: 'PRO' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(200);
      expect(RES.body.data).toMatchObject({
        userId: userB,
        subscriptionType: 'PRO',
      });
    });
  },
);
