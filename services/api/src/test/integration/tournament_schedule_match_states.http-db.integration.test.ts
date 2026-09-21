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

//? S6b: `GET /tournaments/:tournamentId/schedule` gana matchId/matchStatus/
//? decision/rejectedByName/sides/scores. AMERICANO siempre materializa duplas
//? (2v2), asi que da el caso de "dos jugadores por lado" con datos reales.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament schedule match states (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let organizerToken: string;
    let organizerUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `s6b-schedule-${Date.now()}`, 'Cat S6b Schedule');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `s6b-organizer-${TS}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createConfirmedPlayerSV(_label: string, _tournamentId: string) {
      const TS = Date.now();
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: `${_label}-${TS}@test.local`, password: 'password123', name: _label })
        .set('Content-Type', 'application/json');
      expect(REG.status).toBe(201);
      const USER_ID = REG.body.data.user.id as string;

      await PRISMA.tournamentRegistration.create({
        data: { tournamentId: _tournamentId, userId: USER_ID, status: 'CONFIRMED' },
      });

      return USER_ID;
    }

    it('reflects a recorded result on the schedule, with matchId, FINISHED status, real scores and two players per side', async () => {
      const TS = Date.now();
      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue Schedule States ${TS}`, latitude: -34.6, longitude: -58.4 },
      });
      const COURT = await PRISMA.court.create({
        data: { name: 'Court Schedule States', venueId: VENUE.id },
      });

      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Schedule States ${TS}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          venueId: VENUE.id,
          status: 'DRAFT',
        },
      });

      await createConfirmedPlayerSV('sched-a', TOURNAMENT.id);
      await createConfirmedPlayerSV('sched-b', TOURNAMENT.id);
      await createConfirmedPlayerSV('sched-c', TOURNAMENT.id);
      await createConfirmedPlayerSV('sched-d', TOURNAMENT.id);

      await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      //? La reserva automática de turno (courtId/scheduledAt) depende de
      //? disponibilidad real y no es lo que este test cubre; se fuerza la
      //? cancha aquí para que `getVenueIdForTournamentSV` (usado por el guard
      //? de resultados) resuelva la sede del torneo a través del partido.
      await PRISMA.match.updateMany({
        where: { tournamentId: TOURNAMENT.id },
        data: { courtId: COURT.id },
      });

      //? AMERICANO con 4 jugadores materializa 3 partidos (round-robin de duplas
      //? rotando parejas), todos de una: se toma el de la ronda 1.
      const FIRST_MATCH = await PRISMA.match.findFirstOrThrow({
        where: {
          tournamentId: TOURNAMENT.id,
          formatParameters: { path: ['roundNumber'], equals: 1 },
        },
        include: { participants: true },
      });
      const TEAM_A = FIRST_MATCH.participants.filter((_p) => _p.teamLabel === 'A');
      const TEAM_B = FIRST_MATCH.participants.filter((_p) => _p.teamLabel === 'B');
      expect(TEAM_A).toHaveLength(2);
      expect(TEAM_B).toHaveLength(2);

      const BEFORE_RES = await request(APP)
        .get(`/api/v1/tournaments/${TOURNAMENT.id}/schedule`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(BEFORE_RES.status).toBe(200);

      const BEFORE_MATCH = BEFORE_RES.body.data.rounds
        .flatMap((_r: { matches: Array<{ matchNumber: number; roundNumber: number }> }) => _r.matches)
        .find((_m: { roundNumber: number; matchNumber: number }) => _m.roundNumber === 1);
      expect(BEFORE_MATCH.matchId).toBe(FIRST_MATCH.id);
      expect(BEFORE_MATCH.matchStatus).toBe('SCHEDULED');
      expect(BEFORE_MATCH.scores).toEqual([]);
      expect(BEFORE_MATCH.sides).toHaveLength(2);
      for (const SIDE of BEFORE_MATCH.sides) {
        expect(SIDE.userIds).toHaveLength(2);
      }

      const SCORES = [
        { userId: TEAM_A[0]!.userId as string, tournamentRegistrationId: TEAM_A[0]!.tournamentRegistrationId as string, points: 6 },
        { userId: TEAM_A[1]!.userId as string, tournamentRegistrationId: TEAM_A[1]!.tournamentRegistrationId as string, points: 6 },
        { userId: TEAM_B[0]!.userId as string, tournamentRegistrationId: TEAM_B[0]!.tournamentRegistrationId as string, points: 3 },
        { userId: TEAM_B[1]!.userId as string, tournamentRegistrationId: TEAM_B[1]!.tournamentRegistrationId as string, points: 3 },
      ];
      const RESULT_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/matches/${FIRST_MATCH.id}/results`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ scores: SCORES })
        .set('Content-Type', 'application/json');
      expect(RESULT_RES.status).toBe(201);

      const AFTER_RES = await request(APP)
        .get(`/api/v1/tournaments/${TOURNAMENT.id}/schedule`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(AFTER_RES.status).toBe(200);

      const AFTER_MATCH = AFTER_RES.body.data.rounds
        .flatMap((_r: { matches: Array<{ matchNumber: number; roundNumber: number }> }) => _r.matches)
        .find((_m: { roundNumber: number; matchNumber: number }) => _m.roundNumber === 1);
      expect(AFTER_MATCH.matchId).toBe(FIRST_MATCH.id);
      expect(AFTER_MATCH.matchStatus).toBe('FINISHED');
      expect(
        (AFTER_MATCH.scores as Array<{ userId: string; tournamentRegistrationId: string; points: number }>).sort((_a, _b) =>
          _a.userId.localeCompare(_b.userId),
        ),
      ).toEqual([...SCORES].sort((_a, _b) => _a.userId.localeCompare(_b.userId)));
    });
  },
);
