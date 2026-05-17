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
  'Integración MCP — confirmación reserva con settlementAmount',
  () => {
    let app: Awaited<ReturnType<typeof import('../../app.js').createApp>>;
    let staffUserId: string;
    let payerUserId: string;
    let venueId: string;
    let reservationId: string;
    let txId: string;
    let authToken: string;
    let scheduledAt: Date;

    beforeAll(async () => {
      process.env.MULTI_CURRENCY_PAYMENTS = 'true';
      const { createApp } = await import('../../app.js');
      app = createApp();

      await resetDatabaseForTestsSV();
      await ensureTestCatalogSV();

      const SPORT = await PRISMA.sport.findUnique({ where: { code: 'PADEL' } });
      const CAT = await PRISMA.category.create({
        data: { name: 'MCP Cat', slug: `mcp-${Date.now()}` },
      });

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `mcp-staff-${TS}@test.local`, name: 'Staff' },
      });
      const PAYER = await PRISMA.user.create({
        data: { email: `mcp-payer-${TS}@test.local`, name: 'Payer' },
      });
      staffUserId = STAFF.id;
      payerUserId = PAYER.id;
      authToken = signAccessTokenSV(staffUserId, `mcp-staff-${TS}@test.local`);

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Sede MCP',
          pricingCurrency: 'USD',
          displayCurrency: 'USD',
        },
      });
      venueId = VENUE.id;

      await PRISMA.venueMonetizationSettings.create({
        data: { venueId, updatedAt: new Date() },
      });

      const COURT = await PRISMA.court.create({
        data: {
          name: 'Cancha MCP',
          venueId,
        },
      });

      await PRISMA.venueStaff.create({
        data: { venueId, userId: staffUserId, role: 'STAFF' },
      });

      scheduledAt = new Date();
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 7);

      const RESERVATION = await PRISMA.reservation.create({
        data: {
          venueId,
          courtId: COURT.id,
          sportId: SPORT!.id,
          categoryId: CAT.id,
          scheduledAt,
          createdByUserId: staffUserId,
          pricingCurrency: 'USD',
          totalAmountMinor: 10000n,
          totalAmountCents: 10000,
          paidAmountMinor: 0n,
        },
      });
      reservationId = RESERVATION.id;

      const EFFECTIVE_DATE = new Date(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(scheduledAt) + 'T00:00:00.000Z',
      );

      await PRISMA.exchangeRate.upsert({
        where: {
          countryCode_currency_effectiveDate: {
            countryCode: 'VE',
            currency: 'USD',
            effectiveDate: EFFECTIVE_DATE,
          },
        },
        create: {
          countryCode: 'VE',
          currency: 'USD',
          rateToBs: new Prisma.Decimal('50.0000'),
          effectiveDate: EFFECTIVE_DATE,
          source: 'test',
        },
        update: {
          rateToBs: new Prisma.Decimal('50.0000'),
        },
      });

      const PAYMENT_METHOD = await PRISMA.venuePaymentMethod.create({
        data: {
          venueId,
          type: 'CASH',
          name: 'Efectivo USD',
          settlementCurrency: 'USD',
          position: 0,
        },
      });

      await PRISMA.feeRule.create({
        data: {
          scope: 'RESERVATION',
          type: 'FIXED',
          value: new Prisma.Decimal('0'),
          isActive: true,
        },
      });

      const OBLIGATIONS = await request(app)
        .post(`/api/v1/reservations/${reservationId}/transactions/create-obligations`)
        .send({ amountBasePerPerson: 50, participantUserIds: [payerUserId] })
        .set('Content-Type', 'application/json');

      expect(OBLIGATIONS.status).toBe(201);
      txId = OBLIGATIONS.body.data.created[0].id as string;

      expect(PAYMENT_METHOD.id).toBeTruthy();
    });

    afterAll(async () => {
      if (PREV_FLAG === undefined) {
        delete process.env.MULTI_CURRENCY_PAYMENTS;
      } else {
        process.env.MULTI_CURRENCY_PAYMENTS = PREV_FLAG;
      }
      await PRISMA.$disconnect();
    });

    it('should return 400 when settlementAmount is missing with MCP flag', async () => {
      const RES = await request(app)
        .patch(`/api/v1/transactions/${txId}/confirm-manual`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(RES.status).toBe(400);
    });

    it('should confirm with settlementAmount and expose MoneyAmount in response', async () => {
      const RES = await request(app)
        .patch(`/api/v1/transactions/${txId}/confirm-manual`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          settlementAmount: { amountMinor: '5500', currencyCode: 'USD' },
        });

      expect(RES.status).toBe(200);
      expect(RES.body.data.status).toBe('CONFIRMED');
      expect(RES.body.data.settlementAmount).toEqual({
        amountMinor: '5500',
        currencyCode: 'USD',
      });
      expect(RES.body.data.appliedToObligation?.currencyCode).toBe('USD');
      expect(RES.body.data.reservationPayment?.paymentStatus).toBe('PARTIAL');
    });

    it('GET reservation payment summary should include pricingCurrency and paidAmount', async () => {
      const RES = await request(app).get(
        `/api/v1/reservations/${reservationId}/transactions/summary`,
      );

      expect(RES.status).toBe(200);
      expect(RES.body.data.pricingCurrency).toBe('USD');
      expect(RES.body.data.paidAmount).toEqual({
        amountMinor: '5500',
        currencyCode: 'USD',
      });
      expect(RES.body.data.reservationTotalAmount).toEqual({
        amountMinor: '10000',
        currencyCode: 'USD',
      });
    });
  },
);
