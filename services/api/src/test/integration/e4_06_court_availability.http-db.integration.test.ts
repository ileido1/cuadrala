import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { seedPublishedMatchReservationSV } from '../helpers/published-match-reservation.seed.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'US-E4-06 — Integración HTTP + DB: disponibilidad de canchas por sede',
  () => {
    let sportPadelId: string;
    let sportTennisId: string;
    let categoryPadelId: string;
    let categoryOtherId: string;
    let token: string;
    let actorUserId: string;
    let venueAId: string;
    let courtA1Id: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;
      sportTennisId = CATALOG.sportTennisId;

      const TS = Date.now();
      const [CAT_P, CAT_O] = await Promise.all([
        PRISMA.category.create({ data: { name: 'Cat Avail P', slug: `e4-06-p-${TS}` } }),
        PRISMA.category.create({ data: { name: 'Cat Avail O', slug: `e4-06-o-${TS}` } }),
      ]);
      categoryPadelId = CAT_P.id;
      categoryOtherId = CAT_O.id;

      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({
          email: `e4-06-${TS}@test.local`,
          password: 'password123',
          name: 'User E4-06',
        })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      token = REG.body.data.accessToken as string;
      actorUserId = REG.body.data.user.id as string;

      const VENUE_A = await PRISMA.venue.create({
        data: { name: `Club A ${TS}` },
      });
      venueAId = VENUE_A.id;

      const COURT_A1 = await PRISMA.court.create({
        data: { venueId: venueAId, name: 'Cancha A1' },
      });
      courtA1Id = COURT_A1.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('devuelve slots disponibles sin partidos', async () => {
      const FROM = new Date('2026-06-10T10:00:00.000Z');
      const TO = new Date('2026-06-10T12:00:00.000Z');

      const RES = await request(APP)
        .get(`/api/v1/venues/${venueAId}/availability`)
        .query({
          courtId: courtA1Id,
          from: FROM.toISOString(),
          to: TO.toISOString(),
          durationMinutes: 90,
          stepMinutes: 30,
          sportId: sportPadelId,
          categoryId: categoryPadelId,
        });

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);
      expect(RES.body.data.courts).toHaveLength(1);
      expect(RES.body.data.courts[0].court.id).toBe(courtA1Id);

      const SLOTS = RES.body.data.courts[0].slots as Array<{ scheduledAt: string; isAvailable: boolean; reason?: string }>;
      expect(SLOTS).toHaveLength(4); // 10:00, 10:30, 11:00, 11:30
      expect(SLOTS[0]).toMatchObject({ scheduledAt: '2026-06-10T10:00:00.000Z', isAvailable: true });
      expect(SLOTS[1]).toMatchObject({ scheduledAt: '2026-06-10T10:30:00.000Z', isAvailable: true });
      expect(SLOTS[2]).toMatchObject({ scheduledAt: '2026-06-10T11:00:00.000Z', isAvailable: false, reason: 'OUT_OF_RANGE' });
      expect(SLOTS[3]).toMatchObject({ scheduledAt: '2026-06-10T11:30:00.000Z', isAvailable: false, reason: 'OUT_OF_RANGE' });
    });

    function authPostMatch(_body: Record<string, unknown>) {
      return request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(_body);
    }

    it('marca ocupado si hay match SCHEDULED solapado', async () => {
      const T0 = new Date('2026-06-11T10:00:00.000Z');
      const CREATED = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        venueId: venueAId,
        scheduledAt: T0.toISOString(),
      });
      expect(CREATED.status).toBe(201);

      const RES = await request(APP)
        .get(`/api/v1/venues/${venueAId}/availability`)
        .query({
          courtId: courtA1Id,
          from: '2026-06-11T10:00:00.000Z',
          to: '2026-06-11T12:00:00.000Z',
          durationMinutes: 90,
          stepMinutes: 30,
          sportId: sportPadelId,
          categoryId: categoryPadelId,
        });

      expect(RES.status).toBe(200);
      const SLOTS = RES.body.data.courts[0].slots as Array<{ scheduledAt: string; isAvailable: boolean; reason?: string }>;
      expect(SLOTS[0]).toMatchObject({ scheduledAt: '2026-06-11T10:00:00.000Z', isAvailable: false, reason: 'OCCUPIED_MATCH' });
      expect(SLOTS[1]).toMatchObject({ scheduledAt: '2026-06-11T10:30:00.000Z', isAvailable: false, reason: 'OCCUPIED_MATCH' });
    });

    it('marca incompatible si hay MATCH PUBLISHED con sport/category distintos', async () => {
      const T_SLOT = new Date('2026-06-12T14:00:00.000Z');
      await seedPublishedMatchReservationSV(PRISMA, {
        venueId: venueAId,
        courtId: courtA1Id,
        sportId: sportTennisId,
        categoryId: categoryOtherId,
        scheduledAt: T_SLOT,
        organizerUserId: actorUserId,
      });

      const RES = await request(APP)
        .get(`/api/v1/venues/${venueAId}/availability`)
        .query({
          courtId: courtA1Id,
          from: '2026-06-12T14:00:00.000Z',
          to: '2026-06-12T16:00:00.000Z',
          durationMinutes: 90,
          stepMinutes: 30,
          sportId: sportPadelId,
          categoryId: categoryPadelId,
        });

      expect(RES.status).toBe(200);
      const SLOTS = RES.body.data.courts[0].slots as Array<{ scheduledAt: string; isAvailable: boolean; reason?: string }>;
      expect(SLOTS[0]).toMatchObject({
        scheduledAt: '2026-06-12T14:00:00.000Z',
        isAvailable: false,
        reason: 'INCOMPATIBLE_VACANT_HOUR',
      });
    });

    it('valida inputs (from<to, step>0, duration>0)', async () => {
      const RES = await request(APP)
        .get(`/api/v1/venues/${venueAId}/availability`)
        .query({
          courtId: courtA1Id,
          from: '2026-06-13T10:00:00.000Z',
          to: '2026-06-13T10:00:00.000Z',
          durationMinutes: 0,
          stepMinutes: 0,
        });

      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    });
  },
);

