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
 * `GET /api/v1/users/me/tournaments` (S3b-2): cubre lo que las pruebas
 * unitarias de S3b-1 no pueden — el guard de auth del router, y la
 * combinacion real de inscripciones/invitaciones/organizacion resuelta
 * contra la base de datos real.
 */
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament viewer summary — GET /api/v1/users/me/tournaments (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `viewer-summary-${Date.now()}`, 'Cat Viewer Summary');
      categoryId = CAT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(_organizerUserId: string | null) {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Viewer Summary ${Date.now()}-${Math.random()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId: _organizerUserId,
          status: 'DRAFT',
        },
      });
    }

    async function createUserAndTokenSV(_label: string) {
      const TS = Date.now();
      const USER = await PRISMA.user.create({
        data: { email: `${_label}-${TS}-${Math.random()}@test.local`, name: _label },
      });
      return { userId: USER.id, token: signAccessTokenSV(USER.id, USER.email) };
    }

    it('responds 401 when there is no auth token', async () => {
      const RES = await request(APP).get('/api/v1/users/me/tournaments');

      expect(RES.status).toBe(401);
      expect(RES.body.success).toBe(false);
    });

    it('returns registered and invited tournaments with their own status, excluding unrelated ones', async () => {
      const VIEWER = await createUserAndTokenSV('viewer-reg-invite');
      const INVITER = await createUserAndTokenSV('inviter');

      const TOURNAMENT_A = await createTournamentSV(null);
      await PRISMA.tournamentRegistration.create({
        data: { tournamentId: TOURNAMENT_A.id, userId: VIEWER.userId, status: 'CONFIRMED' },
      });

      const TOURNAMENT_B = await createTournamentSV(INVITER.userId);
      const INVITATION = await PRISMA.tournamentInvitation.create({
        data: {
          tournamentId: TOURNAMENT_B.id,
          invitedUserId: VIEWER.userId,
          createdByUserId: INVITER.userId,
          status: 'PENDING',
        },
      });

      // Unrelated tournament: the viewer has no registration, invitation, or
      // organizer role here — it must not appear in the response at all.
      await createTournamentSV(null);

      const RES = await request(APP)
        .get('/api/v1/users/me/tournaments')
        .set('Authorization', `Bearer ${VIEWER.token}`);

      expect(RES.status).toBe(200);
      const ITEMS = RES.body.data.items as Array<Record<string, unknown>>;

      const ITEM_A = ITEMS.find((i) => (i['tournament'] as Record<string, unknown>)['id'] === TOURNAMENT_A.id);
      expect(ITEM_A?.['registrationStatus']).toBe('CONFIRMED');
      expect(ITEM_A?.['pendingInvitationId']).toBeNull();
      expect(ITEM_A?.['isOrganizer']).toBe(false);
      expect(ITEM_A?.['pendingRegistrationsCount']).toBeNull();

      const ITEM_B = ITEMS.find((i) => (i['tournament'] as Record<string, unknown>)['id'] === TOURNAMENT_B.id);
      expect(ITEM_B?.['pendingInvitationId']).toBe(INVITATION.id);
      expect(ITEM_B?.['registrationStatus']).toBeNull();

      expect(ITEMS).toHaveLength(2);
    });

    it('returns isOrganizer: true and the pending-registrations count for the organizer', async () => {
      const ORGANIZER = await createUserAndTokenSV('organizer-summary');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const PENDING_ONE = await createUserAndTokenSV('pending-one');
      const PENDING_TWO = await createUserAndTokenSV('pending-two');
      const CONFIRMED_PLAYER = await createUserAndTokenSV('confirmed-player');
      await PRISMA.tournamentRegistration.createMany({
        data: [
          { tournamentId: TOURNAMENT.id, userId: PENDING_ONE.userId, status: 'PENDING' },
          { tournamentId: TOURNAMENT.id, userId: PENDING_TWO.userId, status: 'PENDING' },
          { tournamentId: TOURNAMENT.id, userId: CONFIRMED_PLAYER.userId, status: 'CONFIRMED' },
        ],
      });

      const ORGANIZER_RES = await request(APP)
        .get('/api/v1/users/me/tournaments')
        .set('Authorization', `Bearer ${ORGANIZER.token}`);

      expect(ORGANIZER_RES.status).toBe(200);
      const ORGANIZER_ITEMS = ORGANIZER_RES.body.data.items as Array<Record<string, unknown>>;
      const ORGANIZER_ITEM = ORGANIZER_ITEMS.find(
        (i) => (i['tournament'] as Record<string, unknown>)['id'] === TOURNAMENT.id,
      );
      expect(ORGANIZER_ITEM?.['isOrganizer']).toBe(true);
      expect(ORGANIZER_ITEM?.['pendingRegistrationsCount']).toBe(2);

      // A non-organizer with a registration on the same tournament MUST NOT
      // see the pending count, and MUST NOT be flagged as organizer.
      const NON_ORGANIZER_RES = await request(APP)
        .get('/api/v1/users/me/tournaments')
        .set('Authorization', `Bearer ${CONFIRMED_PLAYER.token}`);

      expect(NON_ORGANIZER_RES.status).toBe(200);
      const NON_ORGANIZER_ITEMS = NON_ORGANIZER_RES.body.data.items as Array<Record<string, unknown>>;
      const NON_ORGANIZER_ITEM = NON_ORGANIZER_ITEMS.find(
        (i) => (i['tournament'] as Record<string, unknown>)['id'] === TOURNAMENT.id,
      );
      expect(NON_ORGANIZER_ITEM?.['isOrganizer']).toBe(false);
      expect(NON_ORGANIZER_ITEM?.['pendingRegistrationsCount']).toBeNull();
    });
  },
);
