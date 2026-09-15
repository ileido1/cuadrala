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

/**
 * `organizerName` (listado + detalle) y `invitedUserName` (invitaciones) se
 * resuelven vía join, sin cambio de schema. Sin organizador asignado el
 * primero queda `null`; toda invitación hoy requiere un usuario autenticado
 * (`invitedUserId` es NOT NULL en el schema), así que `invitedUserName`
 * siempre viaja poblado para las invitaciones reales — el caso `null` está
 * cubierto a nivel de mapper puro (`prisma_tournament_invitation_mapper.test.ts`).
 */
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament organizerName + invitedUserName (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let organizerToken: string;
    let organizerUserId: string;
    let organizerName: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(
        sportId,
        `organizer-invitee-${Date.now()}`,
        'Cat Organizer Invitee',
      );
      categoryId = CAT.id;

      const TS = Date.now();
      organizerName = 'Organizadora Valentina';
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-name-${TS}@test.local`, name: organizerName },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(_organizerUserId: string | null) {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Organizer/Invitee ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId: _organizerUserId,
          status: 'DRAFT',
        },
      });
    }

    it('includes organizerName on the listing and detail when the tournament has an organizer', async () => {
      const TOURNAMENT = await createTournamentSV(organizerUserId);

      const LIST_RES = await request(APP).get('/api/v1/tournaments?limit=100');
      const ITEM = (LIST_RES.body.data.items as Array<Record<string, unknown>>).find(
        (i) => i['id'] === TOURNAMENT.id,
      );
      expect(ITEM?.['organizerName']).toBe(organizerName);

      const DETAIL_RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT.id}`);
      expect(DETAIL_RES.status).toBe(200);
      expect(DETAIL_RES.body.data.tournament.organizerName).toBe(organizerName);
    });

    it('returns organizerName: null on the listing when the tournament has no organizer', async () => {
      const TOURNAMENT = await createTournamentSV(null);

      const LIST_RES = await request(APP).get('/api/v1/tournaments?limit=100');
      const ITEM = (LIST_RES.body.data.items as Array<Record<string, unknown>>).find(
        (i) => i['id'] === TOURNAMENT.id,
      );
      expect(ITEM?.['organizerName']).toBeNull();
    });

    it('includes invitedUserName for the authenticated invitee on the organizer invitations list', async () => {
      const TOURNAMENT = await createTournamentSV(organizerUserId);
      const TS = Date.now();
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `invitee-name-${TS}@test.local`, password: 'password123', name: 'Invitado Braulio' })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      const INVITEE_USER_ID = REG.body.data.user.id as string;

      const INVITE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: INVITEE_USER_ID })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(INVITE_RES.status).toBe(201);

      const LIST_RES = await request(APP)
        .get(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(LIST_RES.status).toBe(200);
      const INVITATION = (LIST_RES.body.data as Array<Record<string, unknown>>).find(
        (i) => i['invitedUserId'] === INVITEE_USER_ID,
      );
      expect(INVITATION?.['invitedUserName']).toBe('Invitado Braulio');
    });
  },
);
