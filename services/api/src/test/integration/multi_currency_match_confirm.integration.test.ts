import { Prisma } from '../../generated/prisma/client.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const PREV_FLAG = process.env.MULTI_CURRENCY_PAYMENTS;

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Integración MCP — confirmación partido sin settlementAmount (flag ON)',
  () => {
    let app: Awaited<ReturnType<typeof import('../../app.js').createApp>>;
    let categoryId: string;
    let staffUserId: string;
    let payerUserId: string;
    let matchId: string;
    let venueId: string;
    let txPendingId: string;
    let authToken: string;

    beforeAll(async () => {
      process.env.MULTI_CURRENCY_PAYMENTS = 'true';
      const { createApp } = await import('../../app.js');
      app = createApp();

      await resetDatabaseForTestsSV();
      await ensureTestCatalogSV();

      const SLUG = `mcp-match-${Date.now()}`;
      const CAT = await PRISMA.category.create({
        data: { name: 'MCP Match Cat', slug: SLUG },
      });
      categoryId = CAT.id;

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `mcp-match-staff-${TS}@test.local`, name: 'Staff' },
      });
      const PAYER = await PRISMA.user.create({
        data: { email: `mcp-match-payer-${TS}@test.local`, name: 'Payer' },
      });
      staffUserId = STAFF.id;
      payerUserId = PAYER.id;
      authToken = signAccessTokenSV(staffUserId, `mcp-match-staff-${TS}@test.local`);

      await PRISMA.feeRule.create({
        data: {
          scope: 'MATCH',
          type: 'FIXED',
          value: new Prisma.Decimal('0'),
          isActive: true,
        },
      });

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Sede MCP Match',
          pricingCurrency: 'BS',
          displayCurrency: 'BS',
        },
      });
      venueId = VENUE.id;

      const COURT = await PRISMA.court.create({
        data: { name: 'Cancha MCP Match', venueId },
      });

      await PRISMA.venueStaff.create({
        data: { venueId, userId: staffUserId, role: 'STAFF' },
      });

      const CREATE = await request(app)
        .post('/api/v1/americanos')
        .send({
          categoryId,
          participantUserIds: [staffUserId, payerUserId],
        })
        .set('Content-Type', 'application/json');

      expect(CREATE.status).toBe(201);
      matchId = CREATE.body.data.matchId as string;

      await PRISMA.match.update({
        where: { id: matchId },
        data: { courtId: COURT.id },
      });

      const OBLIGATIONS = await request(app)
        .post(`/api/v1/matches/${matchId}/transactions/create-obligations`)
        .send({ amountBasePerPerson: 8 })
        .set('Content-Type', 'application/json');

      expect(OBLIGATIONS.status).toBe(201);
      const PAYER_ROW = OBLIGATIONS.body.data.created.find(
        (_c: { userId: string }) => _c.userId === payerUserId,
      );
      txPendingId = PAYER_ROW.id as string;
    });

    afterAll(async () => {
      if (PREV_FLAG === undefined) {
        delete process.env.MULTI_CURRENCY_PAYMENTS;
      } else {
        process.env.MULTI_CURRENCY_PAYMENTS = PREV_FLAG;
      }
      await PRISMA.$disconnect();
    });

    it('should confirm match transaction without settlementAmount when MCP flag is on', async () => {
      const RES = await request(app)
        .patch(`/api/v1/transactions/${txPendingId}/confirm-manual`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(RES.status).toBe(200);
      expect(RES.body.data.status).toBe('CONFIRMED');
      expect(RES.body.data.settlementAmount).toBeUndefined();
      expect(RES.body.data.reservationPayment).toBeUndefined();

      const ROW = await PRISMA.transaction.findUnique({
        where: { id: txPendingId },
      });
      expect(ROW?.status).toBe('CONFIRMED');
      expect(ROW?.obligationCurrency).toBeNull();
    });
  },
);
