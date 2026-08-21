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
  'Tournament guest registration — invite / confirm / remove (HTTP + DB)',
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

      const CAT = await createTestCategorySV(sportId, `tourn-guest-${Date.now()}`, 'Cat Tourn Guest');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-guest-${TS}@test.local`, name: 'Organizer' },
      });
      const OUTSIDER = await PRISMA.user.create({
        data: { email: `outsider-guest-${TS}@test.local`, name: 'Outsider' },
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
          name: `Torneo Guest ${_status} ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: _status,
        },
      });
    }

    async function inviteGuestSV(
      _tournamentId: string,
      _token: string,
      _body: { name?: string; phone?: string; email?: string } = { name: 'Carlos', phone: '+584121234567' },
    ) {
      return request(APP)
        .post(`/api/v1/tournaments/${_tournamentId}/invite-guest`)
        .send(_body)
        .set('Authorization', `Bearer ${_token}`)
        .set('Content-Type', 'application/json');
    }

    describe('POST /tournaments/:id/invite-guest', () => {
      it('lets the organizer invite a guest, creating a PENDING GUEST registration', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await inviteGuestSV(TOURNAMENT.id, organizerToken, {
          name: 'Carlos Perez',
          phone: '+584121234567',
        });

        expect(RES.status).toBe(201);
        expect(RES.body.data.registrationType).toBe('GUEST');
        expect(RES.body.data.status).toBe('PENDING');
        expect(RES.body.data.userId).toBeNull();
        expect(RES.body.data.guestName).toBe('Carlos Perez');
        expect(RES.body.data.guestPhone).toBe('+584121234567');
        expect(RES.body.data.registeredByUserId).toBe(organizerUserId);
      });

      it('responds 401 when no token is provided', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await request(APP)
          .post(`/api/v1/tournaments/${TOURNAMENT.id}/invite-guest`)
          .send({ name: 'Carlos' })
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(401);
      });

      it('responds 403 when a non-organizer invites a guest', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await inviteGuestSV(TOURNAMENT.id, outsiderToken);

        expect(RES.status).toBe(403);
      });

      it('responds 400 when name is missing', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await inviteGuestSV(TOURNAMENT.id, organizerToken, { phone: '+584121234567' });

        expect(RES.status).toBe(400);
      });

      it('responds 400 when phone has an invalid format', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await inviteGuestSV(TOURNAMENT.id, organizerToken, { name: 'Carlos', phone: 'not-a-phone' });

        expect(RES.status).toBe(400);
      });

      it('responds 404 when the tournament does not exist', async () => {
        const RES = await inviteGuestSV('00000000-0000-0000-0000-000000000000', organizerToken);

        expect(RES.status).toBe(404);
      });

      it('responds 409 when the tournament is IN_PROGRESS', async () => {
        const TOURNAMENT = await createTournamentSV('IN_PROGRESS');

        const RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);

        expect(RES.status).toBe(409);
      });
    });

    describe('PATCH /tournaments/:id/registrations/:registrationId', () => {
      it('lets the organizer confirm a PENDING guest registration', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP)
          .patch(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .send({ status: 'CONFIRMED' })
          .set('Authorization', `Bearer ${organizerToken}`)
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(200);
        expect(RES.body.data.status).toBe('CONFIRMED');
        expect(RES.body.data.registrationType).toBe('GUEST');
      });

      it('responds 401 when no token is provided', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP)
          .patch(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .send({ status: 'CONFIRMED' })
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(401);
      });

      it('responds 403 when a non-organizer confirms a registration', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP)
          .patch(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .send({ status: 'CONFIRMED' })
          .set('Authorization', `Bearer ${outsiderToken}`)
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(403);
      });

      it('responds 404 when the registration does not exist', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await request(APP)
          .patch(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/00000000-0000-0000-0000-000000000000`)
          .send({ status: 'CONFIRMED' })
          .set('Authorization', `Bearer ${organizerToken}`)
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(404);
      });

      it('responds 409 when the tournament is IN_PROGRESS', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        await PRISMA.tournament.update({ where: { id: TOURNAMENT.id }, data: { status: 'IN_PROGRESS' } });

        const RES = await request(APP)
          .patch(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .send({ status: 'CONFIRMED' })
          .set('Authorization', `Bearer ${organizerToken}`)
          .set('Content-Type', 'application/json');

        expect(RES.status).toBe(409);
      });
    });

    describe('DELETE /tournaments/:id/registrations/:registrationId', () => {
      it('lets the organizer remove a guest registration before IN_PROGRESS', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP)
          .delete(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(204);

        const FOUND = await PRISMA.tournamentRegistration.findUnique({ where: { id: REGISTRATION_ID } });
        expect(FOUND).toBeNull();
      });

      it('responds 401 when no token is provided', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP).delete(
          `/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`,
        );

        expect(RES.status).toBe(401);
      });

      it('responds 403 when a non-organizer removes a registration', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        const RES = await request(APP)
          .delete(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect(RES.status).toBe(403);
      });

      it('responds 404 when the registration does not exist', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');

        const RES = await request(APP)
          .delete(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(404);
      });

      it('responds 409 when the tournament is IN_PROGRESS', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const INVITE_RES = await inviteGuestSV(TOURNAMENT.id, organizerToken);
        const REGISTRATION_ID = INVITE_RES.body.data.id as string;

        await PRISMA.tournament.update({ where: { id: TOURNAMENT.id }, data: { status: 'IN_PROGRESS' } });

        const RES = await request(APP)
          .delete(`/api/v1/tournaments/${TOURNAMENT.id}/registrations/${REGISTRATION_ID}`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(409);
      });
    });

    describe('GET /tournaments/:id/registrations — mixed roster', () => {
      it('exposes registrationType and guest identity fields alongside authenticated rows', async () => {
        const TOURNAMENT = await createTournamentSV('DRAFT');
        const TS = Date.now();
        const PLAYER = await PRISMA.user.create({
          data: { email: `auth-player-${TS}@test.local`, name: 'Auth Player' },
        });
        await PRISMA.tournamentRegistration.create({
          data: { tournamentId: TOURNAMENT.id, userId: PLAYER.id, status: 'CONFIRMED' },
        });
        await inviteGuestSV(TOURNAMENT.id, organizerToken, { name: 'Marta Invitada', phone: '+584121230000' });

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}/registrations`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(200);
        const ITEMS = RES.body.data.items as Array<Record<string, unknown>>;
        const AUTH_ROW = ITEMS.find((_i) => _i.userId === PLAYER.id);
        const GUEST_ROW = ITEMS.find((_i) => _i.registrationType === 'GUEST');

        expect(AUTH_ROW?.registrationType).toBe('AUTHENTICATED');
        expect(GUEST_ROW?.guestName).toBe('Marta Invitada');
        expect(GUEST_ROW?.userId).toBeNull();
      });
    });
  },
);
