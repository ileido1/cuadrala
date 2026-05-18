import { Prisma } from '../../generated/prisma/client.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Gate Wave 1 — pagos, tasas y métodos de pago (HTTP + DB)',
  () => {
    let categoryId: string;
    let staffUserId: string;
    let payerUserId: string;
    let matchId: string;
    let venueId: string;
    let txPendingId: string;
    let authToken: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      await ensureTestCatalogSV();

      const SLUG = `gate-cat-${Date.now()}`;
      const CAT = await createTestCategorySV(sportPadelId, SLUG, 'Cat gate');
      categoryId = CAT.id;

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `gate-staff-${TS}@test.local`, name: 'Staff' },
      });
      const PAYER = await PRISMA.user.create({
        data: { email: `gate-payer-${TS}@test.local`, name: 'Payer' },
      });
      staffUserId = STAFF.id;
      payerUserId = PAYER.id;
      authToken = signAccessTokenSV(staffUserId, `gate-staff-${TS}@test.local`);

      await PRISMA.feeRule.create({
        data: {
          scope: 'MATCH',
          type: 'FIXED',
          value: new Prisma.Decimal('0'),
          isActive: true,
        },
      });

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Sede Gate Wave 1' },
      });
      venueId = VENUE.id;

      const COURT = await PRISMA.court.create({
        data: { name: 'Cancha Gate', venueId },
      });

      await PRISMA.venueStaff.create({
        data: { venueId, userId: staffUserId, role: 'STAFF' },
      });

      const EFFECTIVE_DATE = new Date(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date()) + 'T00:00:00.000Z',
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
          source: 'seed',
          effectiveDate: EFFECTIVE_DATE,
        },
        update: {
          rateToBs: new Prisma.Decimal('50.0000'),
          source: 'seed',
        },
      });

      const CREATE = await request(APP)
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

      const OBLIGATIONS = await request(APP)
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
      await PRISMA.$disconnect();
    });

    it('GET /countries/:countryCode/exchange-rates lista tasas sembradas', async () => {
      const RES = await request(APP).get('/api/v1/countries/VE/exchange-rates');

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);
      expect(RES.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(RES.body.data.items.some((_r: { currency: string }) => _r.currency === 'USD')).toBe(
        true,
      );
    });

    it('POST /venues/:venueId/payment-methods crea método activo', async () => {
      const RES = await request(APP)
        .post(`/api/v1/venues/${venueId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'CASH',
          name: 'Efectivo caja',
        });

      expect(RES.status).toBe(201);
      expect(RES.body.data.type).toBe('CASH');
      expect(RES.body.data.name).toBe('Efectivo caja');
    });

    it('GET /venues/:venueId/payment-methods lista métodos activos sin auth', async () => {
      const RES = await request(APP).get(`/api/v1/venues/${venueId}/payment-methods`);

      expect(RES.status).toBe(200);
      expect(RES.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /venues/:venueId/transactions/pending incluye obligación pendiente', async () => {
      const RES = await request(APP)
        .get(`/api/v1/venues/${venueId}/transactions/pending`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(RES.status).toBe(200);
      const IDS = RES.body.data.items.map((_i: { id: string }) => _i.id);
      expect(IDS).toContain(txPendingId);
    });

    it('PATCH /transactions/:id/reject-manual rechaza transacción pendiente', async () => {
      const RES = await request(APP)
        .patch(`/api/v1/transactions/${txPendingId}/reject-manual`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Pago no recibido en prueba de integración' });

      expect(RES.status).toBe(200);
      expect(RES.body.data.status).toBe('CANCELLED');

      const ROW = await PRISMA.transaction.findUnique({ where: { id: txPendingId } });
      expect(ROW?.status).toBe('CANCELLED');
    });
  },
);
