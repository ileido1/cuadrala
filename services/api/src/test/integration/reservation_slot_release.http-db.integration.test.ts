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
  'Liberar el turno de una cancha (HTTP + DB)',
  () => {
    let venueId: string;
    let courtId: string;
    let sportId: string;
    let categoryId: string;
    let staffUserId: string;
    let scheduledAt: Date;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      const CAT = await createTestCategorySV(sportId, `slot-${Date.now()}`, 'Slot Cat');
      categoryId = CAT.id;

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `slot-staff-${TS}@test.local`, name: 'Slot Staff' },
      });
      staffUserId = STAFF.id;
      signAccessTokenSV(staffUserId, `slot-staff-${TS}@test.local`);

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Sede Slot', pricingCurrency: 'USD', displayCurrency: 'USD' },
      });
      venueId = VENUE.id;

      const COURT = await PRISMA.court.create({
        data: { name: 'Cancha Slot', venueId },
      });
      courtId = COURT.id;

      scheduledAt = new Date();
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 7);
      scheduledAt.setUTCMinutes(0, 0, 0);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    const createReservationSV = () =>
      PRISMA.reservation.create({
        data: {
          venueId,
          courtId,
          sportId,
          categoryId,
          scheduledAt,
          createdByUserId: staffUserId,
          pricingCurrency: 'USD',
          totalAmountMinor: 10000n,
          paidAmountMinor: 0n,
        },
      });

    //? `@@unique([courtId, scheduledAt])` aplicaba a TODAS las filas, sin mirar
    //? el estado. Cancelar solo escribe `status: 'CANCELLED'` y deja la fila, así
    //? que el turno quedaba tomado para siempre: la validación de la aplicación
    //? dejaba pasar (mira `status === 'CONFIRMED'`) y reventaba la base.
    it('should let the slot be booked again after the reservation is cancelled', async () => {
      const FIRST = await createReservationSV();
      await PRISMA.reservation.update({
        where: { id: FIRST.id },
        data: { status: 'CANCELLED' },
      });

      const SECOND = await createReservationSV();

      expect(SECOND.id).not.toBe(FIRST.id);
      expect(SECOND.status).toBe('CONFIRMED');
    });

    it('should still refuse two live reservations on the same court and time', async () => {
      await expect(createReservationSV()).rejects.toThrow();
    });
  },
);
