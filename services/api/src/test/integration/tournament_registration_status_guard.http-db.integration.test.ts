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
  'Tournament self-registration status guard (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let playerToken: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `reg-guard-${Date.now()}`, 'Cat Reg Guard');
      categoryId = CAT.id;

      const TS = Date.now();
      const PLAYER = await PRISMA.user.create({
        data: { email: `player-${TS}@test.local`, name: 'Player' },
      });
      playerToken = signAccessTokenSV(PLAYER.id, PLAYER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    //? La ventana de inscripción son DRAFT y OPEN. Antes OPEN daba 409: el
    //? estado que se llama "abierto" era justo donde el jugador no podía
    //? anotarse, mientras el organizador sí podía invitarlo.
    it('responds 201 when self-registering on an OPEN tournament', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Reg Guard OPEN ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          status: 'OPEN',
        },
      });
      const TS = Date.now();
      const PLAYER = await PRISMA.user.create({
        data: { email: `reg-guard-open-${TS}@test.local`, name: 'Reg Guard Open' },
      });

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/registrations`)
        .send({ userId: PLAYER.id })
        .set('Authorization', `Bearer ${playerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.status).toBe('PENDING');
    });

    it('responds 409 when self-registering on a tournament already IN_PROGRESS', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Reg Guard IN_PROGRESS ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          status: 'IN_PROGRESS',
        },
      });
      const TS = Date.now();
      const PLAYER = await PRISMA.user.create({
        data: { email: `reg-guard-inprogress-${TS}@test.local`, name: 'Reg Guard In Progress' },
      });

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/registrations`)
        .send({ userId: PLAYER.id })
        .set('Authorization', `Bearer ${playerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.success).toBe(false);
    });

    it('responds 201 when self-registering on a DRAFT tournament', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Reg Guard DRAFT ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          status: 'DRAFT',
        },
      });
      const TS = Date.now();
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `reg-guard-${TS}@test.local`, password: 'password123', name: 'Reg Guard User' })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/registrations`)
        .send({ userId: REG.body.data.user.id })
        .set('Authorization', `Bearer ${playerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.status).toBe('PENDING');
    });

    it('responds 409 when withdrawing a registration on a tournament that is IN_PROGRESS', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Withdraw Guard IN_PROGRESS ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          status: 'IN_PROGRESS',
        },
      });
      const TS = Date.now();
      const CONFIRMED_USER = await PRISMA.user.create({
        data: { email: `withdraw-guard-${TS}@test.local`, name: 'Withdraw Guard User' },
      });
      await PRISMA.tournamentRegistration.create({
        data: {
          tournamentId: TOURNAMENT.id,
          userId: CONFIRMED_USER.id,
          status: 'CONFIRMED',
        },
      });

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${CONFIRMED_USER.id}/withdraw`)
        .set('Authorization', `Bearer ${playerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.success).toBe(false);
    });
  },
);
