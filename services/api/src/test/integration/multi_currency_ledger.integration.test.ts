import { Prisma } from '../../generated/prisma/client.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const PREV_MCP = process.env.MULTI_CURRENCY_PAYMENTS;
const PREV_LEDGER = process.env.RESERVATION_PAYMENT_LEDGER;

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Integración MCP Fase 2 — ledger en confirmación de reserva',
  () => {
    let app: Awaited<ReturnType<typeof import('../../app.js').createApp>>;
    let staffUserId: string;
    let payerUserId: string;
    let venueId: string;
    let reservationId: string;
    let txId: string;
    let paymentMethodId: string;
    let authToken: string;
    let scheduledAt: Date;

    beforeAll(async () => {
      process.env.MULTI_CURRENCY_PAYMENTS = 'true';
      process.env.RESERVATION_PAYMENT_LEDGER = 'true';
      const { createApp } = await import('../../app.js');
      app = createApp();

      await resetDatabaseForTestsSV();
      await ensureTestCatalogSV();

      const SPORT = await PRISMA.sport.findUnique({ where: { code: 'PADEL' } });
      const CAT = await PRISMA.category.create({
        data: { name: 'Ledger Cat', slug: `ledger-${Date.now()}` },
      });

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `ledger-staff-${TS}@test.local`, name: 'Staff' },
      });
      const PAYER = await PRISMA.user.create({
        data: { email: `ledger-payer-${TS}@test.local`, name: 'Payer' },
      });
      staffUserId = STAFF.id;
      payerUserId = PAYER.id;
      authToken = signAccessTokenSV(staffUserId, `ledger-staff-${TS}@test.local`);

      const VENUE = await PRISMA.venue.create({
        data: {
          name: 'Sede Ledger',
          pricingCurrency: 'USD',
          displayCurrency: 'USD',
        },
      });
      venueId = VENUE.id;

      await PRISMA.venueMonetizationSettings.create({
        data: { venueId, updatedAt: new Date() },
      });

      const COURT = await PRISMA.court.create({
        data: { name: 'Cancha Ledger', venueId },
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
        update: { rateToBs: new Prisma.Decimal('50.0000') },
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
      paymentMethodId = PAYMENT_METHOD.id;

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
    });

    afterAll(async () => {
      if (PREV_MCP === undefined) {
        delete process.env.MULTI_CURRENCY_PAYMENTS;
      } else {
        process.env.MULTI_CURRENCY_PAYMENTS = PREV_MCP;
      }
      if (PREV_LEDGER === undefined) {
        delete process.env.RESERVATION_PAYMENT_LEDGER;
      } else {
        process.env.RESERVATION_PAYMENT_LEDGER = PREV_LEDGER;
      }
      await PRISMA.$disconnect();
    });

    it('should create PAYMENT ledger entry and paidAmountBs on confirm', async () => {
      const RES = await request(app)
        .patch(`/api/v1/transactions/${txId}/confirm-manual`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          venuePaymentMethodId: paymentMethodId,
          settlementAmount: { amountMinor: '5500', currencyCode: 'USD' },
        });

      expect(RES.status).toBe(200);

      const LEDGER = await PRISMA.reservationPaymentLedger.findMany({
        where: { reservationId, transactionId: txId },
      });
      expect(LEDGER).toHaveLength(1);
      expect(LEDGER[0]?.entryType).toBe('PAYMENT');
      expect(LEDGER[0]?.direction).toBe('CREDIT');
      expect(LEDGER[0]?.amountMinor).toBe(5500n);
      expect(LEDGER[0]?.actorUserId).toBe(staffUserId);

      const RESERVATION = await PRISMA.reservation.findUnique({
        where: { id: reservationId },
      });
      expect(RESERVATION?.paidAmountBsMinor).not.toBeNull();
      expect(RESERVATION!.paidAmountBsMinor!).toBeGreaterThan(0n);
    });

    it('GET summary should include paidAmountBs when ledger flag is on', async () => {
      const RES = await request(app).get(
        `/api/v1/reservations/${reservationId}/transactions/summary`,
      );

      expect(RES.status).toBe(200);
      expect(RES.body.data.paidAmountBs).toEqual({
        amountMinor: expect.any(String),
        currencyCode: 'BS',
      });
    });
  },
);
