import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 7 — disponibilidad de cancha al crear/actualizar partido',
  () => {
    let sportPadelId: string;
    let sportTennisId: string;
    let categoryPadelId: string;
    let categoryOtherId: string;
    let token: string;
    let venueAId: string;
    let venueBId: string;
    let courtA1Id: string;
    let courtB1Id: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;
      sportTennisId = CATALOG.sportTennisId;

      const TS = Date.now();
      const [CAT_P, CAT_O] = await Promise.all([
        PRISMA.category.create({ data: { name: 'Cat Avail P', slug: `avail-p-${TS}` } }),
        PRISMA.category.create({ data: { name: 'Cat Avail O', slug: `avail-o-${TS}` } }),
      ]);
      categoryPadelId = CAT_P.id;
      categoryOtherId = CAT_O.id;

      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({
          email: `avail-${TS}@test.local`,
          password: 'password123',
          name: 'User Avail',
        })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      token = REG.body.data.accessToken as string;

      const VENUE_A = await PRISMA.venue.create({
        data: { name: `Club A ${TS}` },
      });
      const VENUE_B = await PRISMA.venue.create({
        data: { name: `Club B ${TS}` },
      });
      venueAId = VENUE_A.id;
      venueBId = VENUE_B.id;

      const COURT_A1 = await PRISMA.court.create({
        data: { venueId: venueAId, name: 'Cancha A1' },
      });
      const COURT_B1 = await PRISMA.court.create({
        data: { venueId: venueBId, name: 'Cancha B1' },
      });
      courtA1Id = COURT_A1.id;
      courtB1Id = COURT_B1.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    const SLOT = new Date('2026-06-15T18:00:00.000Z');

    function authPostMatch(_body: Record<string, unknown>) {
      return request(APP)
        .post('/api/v1/matches')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(_body);
    }

    it('400 si hay cancha y horario pero falta venueId', async () => {
      const RES = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        scheduledAt: SLOT.toISOString(),
      });
      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    });

    it('400 si solo courtId o solo scheduledAt', async () => {
      const R1 = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
      });
      expect(R1.status).toBe(400);
      expect(R1.body.code).toBe('VALIDACION_FALLIDA');

      const R2 = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        scheduledAt: SLOT.toISOString(),
      });
      expect(R2.status).toBe(400);
    });

    it('400 si venueId no corresponde a la cancha', async () => {
      const RES = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        venueId: venueBId,
        scheduledAt: SLOT.toISOString(),
      });
      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('CANCHA_NO_EN_SEDE');
    });

    it('409 CANCHA_OCUPADA si el horario se solapa con otro partido activo', async () => {
      const T0 = new Date('2026-06-16T10:00:00.000Z');
      const FIRST = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        venueId: venueAId,
        scheduledAt: T0.toISOString(),
      });
      expect(FIRST.status).toBe(201);

      const SECOND = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        venueId: venueAId,
        scheduledAt: new Date(T0.getTime() + 45 * 60_000).toISOString(),
      });
      expect(SECOND.status).toBe(409);
      expect(SECOND.body.code).toBe('CANCHA_OCUPADA');
      expect(SECOND.body.details?.conflictingMatchId).toBe(FIRST.body.data.id);
    });

    it('201 en la misma cancha si el horario no se solapa (ventana por defecto 90 min)', async () => {
      const T0 = new Date('2026-06-17T08:00:00.000Z');
      const M1 = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtB1Id,
        venueId: venueBId,
        scheduledAt: T0.toISOString(),
      });
      expect(M1.status).toBe(201);

      const M2 = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtB1Id,
        venueId: venueBId,
        scheduledAt: new Date(T0.getTime() + 96 * 60_000).toISOString(),
      });
      expect(M2.status).toBe(201);
    });

    it('409 HORARIO_RESERVA_INCOMPATIBLE si hay vacante publicada con otro deporte/categoría', async () => {
      const T_SLOT = new Date('2026-06-18T14:00:00.000Z');
      await PRISMA.vacantHour.create({
        data: {
          venueId: venueAId,
          courtId: courtA1Id,
          sportId: sportTennisId,
          categoryId: categoryOtherId,
          scheduledAt: T_SLOT,
          status: 'PUBLISHED',
        },
      });

      const RES = await authPostMatch({
        sportId: sportPadelId,
        categoryId: categoryPadelId,
        type: 'REGULAR',
        maxParticipants: 4,
        courtId: courtA1Id,
        venueId: venueAId,
        scheduledAt: T_SLOT.toISOString(),
      });
      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('HORARIO_RESERVA_INCOMPATIBLE');
    });
  },
);
