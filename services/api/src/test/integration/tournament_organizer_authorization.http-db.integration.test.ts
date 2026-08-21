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
  'Tournament organizer authorization — status transition + schedule:generate (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let organizerToken: string;
    let outsiderToken: string;
    let organizerUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `tourn-auth-${Date.now()}`, 'Cat Tourn Auth');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-${TS}@test.local`, name: 'Organizer' },
      });
      const OUTSIDER = await PRISMA.user.create({
        data: { email: `outsider-${TS}@test.local`, name: 'Outsider' },
      });
      organizerUserId = ORGANIZER.id;

      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
      outsiderToken = signAccessTokenSV(OUTSIDER.id, OUTSIDER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(_status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Auth ${_status} ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: _status,
        },
      });
    }

    it('responds 403 when a non-organizer transitions tournament status', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');

      const RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${outsiderToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);
      expect(RES.body.success).toBe(false);
    });

    it('responds 200 when the organizer transitions tournament status legally', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');

      const RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(200);
      expect(RES.body.data.status).toBe('OPEN');
    });

    it('responds 409 when transitioning COMPLETED -> OPEN (illegal transition)', async () => {
      const TOURNAMENT = await createTournamentSV('COMPLETED');

      const RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('ESTADO_INVALIDO');
    });

    it('responds 403 when a non-organizer calls schedule:generate', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${outsiderToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);
      expect(RES.body.success).toBe(false);
    });
  },
);
