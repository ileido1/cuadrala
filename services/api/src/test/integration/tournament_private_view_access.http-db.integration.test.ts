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

//? Cierra #74 (detalle + scoreboard sin autorización) y #75 (bracket logueado
//? pero sin chequeo de rol): un torneo PRIVATE solo puede verlo organizador,
//? staff de la sede, o un participante con inscripción activa.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Private tournament view access — detail/scoreboard/bracket (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let organizerUserId: string;
    let organizerToken: string;
    let outsiderToken: string;
    let participantToken: string;
    let participantUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `priv-view-${Date.now()}`, 'Cat Priv View');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `priv-organizer-${TS}@test.local`, name: 'Organizer' },
      });
      const OUTSIDER = await PRISMA.user.create({
        data: { email: `priv-outsider-${TS}@test.local`, name: 'Outsider' },
      });
      const PARTICIPANT = await PRISMA.user.create({
        data: { email: `priv-participant-${TS}@test.local`, name: 'Participant' },
      });
      organizerUserId = ORGANIZER.id;
      participantUserId = PARTICIPANT.id;

      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
      outsiderToken = signAccessTokenSV(OUTSIDER.id, OUTSIDER.email);
      participantToken = signAccessTokenSV(PARTICIPANT.id, PARTICIPANT.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createPrivateTournamentSV() {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Privado ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'IN_PROGRESS',
          visibility: 'PRIVATE',
        },
      });
      await PRISMA.tournamentRegistration.create({
        data: { tournamentId: TOURNAMENT.id, userId: participantUserId, status: 'CONFIRMED' },
      });
      return TOURNAMENT;
    }

    describe('GET /tournaments/:tournamentId', () => {
      it('responds 401 without a session', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT.id}`);

        expect(RES.status).toBe(401);
        expect(RES.body.success).toBe(false);
      });

      it('responds 403 for an outsider actor', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}`)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect(RES.status).toBe(403);
        expect(RES.body.success).toBe(false);
      });

      it('responds 200 for the organizer', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(200);
        expect(RES.body.data.tournament.id).toBe(TOURNAMENT.id);
      });

      it('responds 200 for a participant with an active registration', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}`)
          .set('Authorization', `Bearer ${participantToken}`);

        expect(RES.status).toBe(200);
        expect(RES.body.data.tournament.id).toBe(TOURNAMENT.id);
      });
    });

    describe('GET /tournaments/:tournamentId/scoreboard', () => {
      it('responds 401 without a session', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT.id}/scoreboard`);

        expect(RES.status).toBe(401);
        expect(RES.body.success).toBe(false);
      });

      it('responds 403 for an outsider actor', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}/scoreboard`)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect(RES.status).toBe(403);
        expect(RES.body.success).toBe(false);
      });

      it('responds 200 for the organizer', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}/scoreboard`)
          .set('Authorization', `Bearer ${organizerToken}`);

        expect(RES.status).toBe(200);
        expect(Array.isArray(RES.body.data.rows)).toBe(true);
      });
    });

    describe('GET /tournaments/:tournamentId/bracket', () => {
      it('responds 403 for an outsider actor (bracket already requires a session)', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP)
          .get(`/api/v1/tournaments/${TOURNAMENT.id}/bracket`)
          .set('Authorization', `Bearer ${outsiderToken}`);

        expect(RES.status).toBe(403);
        expect(RES.body.success).toBe(false);
      });

      it('responds 401 without a session', async () => {
        const TOURNAMENT = await createPrivateTournamentSV();

        const RES = await request(APP).get(`/api/v1/tournaments/${TOURNAMENT.id}/bracket`);

        expect(RES.status).toBe(401);
        expect(RES.body.success).toBe(false);
      });
    });
  },
);
