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
  'Tournament invitations — invite / accept / reject / duplicate (HTTP + DB)',
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

      const CAT = await createTestCategorySV(sportId, `tourn-invite-${Date.now()}`, 'Cat Tourn Invite');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-invite-${TS}@test.local`, name: 'Organizer' },
      });
      const OUTSIDER = await PRISMA.user.create({
        data: { email: `outsider-invite-${TS}@test.local`, name: 'Outsider' },
      });
      organizerUserId = ORGANIZER.id;

      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
      outsiderToken = signAccessTokenSV(OUTSIDER.id, OUTSIDER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV(_status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS') {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Invite ${_status} ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: _status,
        },
      });
    }

    async function createPlayerAndTokenSV(_label: string) {
      const TS = Date.now();
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `${_label}-${TS}@test.local`, password: 'password123', name: _label })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      return {
        userId: REG.body.data.user.id as string,
        token: REG.body.data.accessToken as string,
      };
    }

    it('lets the organizer invite a player, creating a PENDING invitation', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-a');

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.status).toBe('PENDING');
      expect(RES.body.data.invitedUserId).toBe(PLAYER.userId);
    });

    it('completes invite -> accept -> CONFIRMED registration', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-b');

      const INVITE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(INVITE_RES.status).toBe(201);
      const INVITATION_ID = INVITE_RES.body.data.id as string;

      const RESPOND_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations/${INVITATION_ID}/respond`)
        .send({ action: 'ACCEPT' })
        .set('Authorization', `Bearer ${PLAYER.token}`)
        .set('Content-Type', 'application/json');

      expect(RESPOND_RES.status).toBe(200);
      expect(RESPOND_RES.body.data.status).toBe('ACCEPTED');

      const REGISTRATION = await PRISMA.tournamentRegistration.findUnique({
        where: { tournamentId_userId: { tournamentId: TOURNAMENT.id, userId: PLAYER.userId } },
      });
      expect(REGISTRATION?.status).toBe('CONFIRMED');
    });

    it('lets the invitee reject an invitation without creating a registration', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-c');

      const INVITE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      const INVITATION_ID = INVITE_RES.body.data.id as string;

      const RESPOND_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations/${INVITATION_ID}/respond`)
        .send({ action: 'REJECT' })
        .set('Authorization', `Bearer ${PLAYER.token}`)
        .set('Content-Type', 'application/json');

      expect(RESPOND_RES.status).toBe(200);
      expect(RESPOND_RES.body.data.status).toBe('REJECTED');

      const REGISTRATION = await PRISMA.tournamentRegistration.findUnique({
        where: { tournamentId_userId: { tournamentId: TOURNAMENT.id, userId: PLAYER.userId } },
      });
      expect(REGISTRATION).toBeNull();
    });

    it('responds 409 when inviting a user who already has an active invitation', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-d');

      const FIRST = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(FIRST.status).toBe(201);

      const SECOND = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(SECOND.status).toBe(409);
      expect(SECOND.body.success).toBe(false);
    });

    it('responds 403 when a non-organizer invites a player', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-e');

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${outsiderToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);
    });

    it('responds 403 when someone other than the invitee tries to respond', async () => {
      const TOURNAMENT = await createTournamentSV('DRAFT');
      const PLAYER = await createPlayerAndTokenSV('invite-player-f');

      const INVITE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      const INVITATION_ID = INVITE_RES.body.data.id as string;

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations/${INVITATION_ID}/respond`)
        .send({ action: 'ACCEPT' })
        .set('Authorization', `Bearer ${outsiderToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(403);
    });

    it('responds 409 when inviting a player once the tournament is IN_PROGRESS', async () => {
      const TOURNAMENT = await createTournamentSV('IN_PROGRESS');
      const PLAYER = await createPlayerAndTokenSV('invite-player-g');

      const RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/invitations`)
        .send({ userId: PLAYER.userId })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
    });
  },
);
