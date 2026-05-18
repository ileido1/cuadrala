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
  'Mobile alignment — create match publica reserva MATCH',
  () => {
    let sportPadelId: string;
    let categoryId: string;
    let token: string;
    let venueId: string;
    let courtId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await createTestCategorySV(sportPadelId, `mobile-m2-${TS}`, 'Cat Mobile M2');
      categoryId = CAT.id;

      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({
          email: `mobile-m2-${TS}@test.local`,
          password: 'password123',
          name: 'User Mobile M2',
        })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      token = REG.body.data.accessToken as string;

      const VENUE = await PRISMA.venue.create({
        data: { name: `Club Mobile M2 ${TS}`, pricingCurrency: 'USD' },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({
        data: { venueId, name: 'Cancha 1' },
      });
      courtId = COURT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    function authPostMatch(_body: Record<string, unknown>) {
      return request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(_body);
    }

    it('should create linked MATCH PUBLISHED reservation when court and venue are set', async () => {
      const SCHEDULED_AT = new Date('2026-07-10T15:00:00.000Z');
      const RES = await authPostMatch({
        sportId: sportPadelId,
        categoryId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId,
        venueId,
        scheduledAt: SCHEDULED_AT.toISOString(),
        durationMinutes: 90,
      });

      expect(RES.status).toBe(201);
      const MATCH_ID = RES.body.data.id as string;

      const RESERVATION = await PRISMA.reservation.findUnique({
        where: { matchId: MATCH_ID },
      });

      expect(RESERVATION).not.toBeNull();
      expect(RESERVATION?.type).toBe('MATCH');
      expect(RESERVATION?.visibility).toBe('PUBLISHED');
      expect(RESERVATION?.status).toBe('CONFIRMED');
      expect(RESERVATION?.courtId).toBe(courtId);
      expect(RESERVATION?.scheduledAt.toISOString()).toBe(SCHEDULED_AT.toISOString());
      expect(RESERVATION?.durationMinutes).toBe(90);
    });

    it('should return 409 CONFLICTO when confirmed reservation exists at same court slot', async () => {
      const SCHEDULED_AT = new Date('2026-07-11T16:00:00.000Z');
      const FIRST = await authPostMatch({
        sportId: sportPadelId,
        categoryId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId,
        venueId,
        scheduledAt: SCHEDULED_AT.toISOString(),
        durationMinutes: 90,
      });
      expect(FIRST.status).toBe(201);

      const SECOND = await authPostMatch({
        sportId: sportPadelId,
        categoryId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId,
        venueId,
        scheduledAt: SCHEDULED_AT.toISOString(),
        durationMinutes: 90,
      });

      expect(SECOND.status).toBe(409);
      expect(['CONFLICTO', 'CANCHA_OCUPADA']).toContain(SECOND.body.code);
    });
  },
);
