import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PrismaTournamentMatchMaterializationRepository } from '../../infrastructure/adapters/prisma_tournament_match_materialization_repository.js';
import { remapScheduleTokensSV } from '../../domain/tournament/tournament_schedule_token_migration.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();
const MATERIALIZATION_REPOSITORY = new PrismaTournamentMatchMaterializationRepository();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament match materialization on OPEN→IN_PROGRESS (HTTP + DB)',
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

      const CAT = await createTestCategorySV(sportId, `tourn-materialize-${Date.now()}`, 'Cat Materialize');
      categoryId = CAT.id;

      const TS = Date.now();
      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-materialize-${TS}@test.local`, name: 'Organizer' },
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

    it('materializes one Match per AMERICANO court/round on OPEN→IN_PROGRESS, with participants and scheduleKey stamped', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Materialize ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'DRAFT',
        },
      });

      await createConfirmedPlayerSV('mat-a', TOURNAMENT.id);
      await createConfirmedPlayerSV('mat-b', TOURNAMENT.id);
      await createConfirmedPlayerSV('mat-c', TOURNAMENT.id);
      await createConfirmedPlayerSV('mat-d', TOURNAMENT.id);

      const OPEN_RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(OPEN_RES.status).toBe(200);

      const GENERATE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(GENERATE_RES.status).toBe(201);
      const SCHEDULE_KEY = GENERATE_RES.body.data.schedule.scheduleKey as string;

      const IN_PROGRESS_RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(IN_PROGRESS_RES.status).toBe(200);
      expect(IN_PROGRESS_RES.body.data.status).toBe('IN_PROGRESS');

      // AMERICANO con 4 participantes genera 3 rondas x 1 cancha = 3 partidos
      const MATCHES = await PRISMA.match.findMany({
        where: { tournamentId: TOURNAMENT.id },
        include: { participants: true },
      });
      expect(MATCHES).toHaveLength(3);
      for (const MATCH of MATCHES) {
        expect(MATCH.status).toBe('SCHEDULED');
        expect(MATCH.type).toBe('AMERICANO');
        expect(MATCH.organizerUserId).toBe(organizerUserId);
        expect(MATCH.participants).toHaveLength(4);
        expect((MATCH.formatParameters as { scheduleKey?: string } | null)?.scheduleKey).toBe(SCHEDULE_KEY);
      }
    });

    it('responds 400 CALENDARIO_NO_GENERADO when transitioning OPEN→IN_PROGRESS without a generated schedule', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Sin Calendario ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'OPEN',
        },
      });

      const RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(RES.body.success).toBe(false);
      expect(RES.body.code).toBe('CALENDARIO_NO_GENERADO');

      const MATCH_COUNT = await PRISMA.match.count({ where: { tournamentId: TOURNAMENT.id } });
      expect(MATCH_COUNT).toBe(0);
      const TOURNAMENT_AFTER = await PRISMA.tournament.findUnique({ where: { id: TOURNAMENT.id } });
      expect(TOURNAMENT_AFTER?.status).toBe('OPEN');
    });

    it('does not duplicate Match rows when materialization is retried for the same scheduleKey (idempotent replay)', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Replay ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'DRAFT',
        },
      });

      await createConfirmedPlayerSV('replay-a', TOURNAMENT.id);
      await createConfirmedPlayerSV('replay-b', TOURNAMENT.id);
      await createConfirmedPlayerSV('replay-c', TOURNAMENT.id);
      await createConfirmedPlayerSV('replay-d', TOURNAMENT.id);

      await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      const GENERATE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      const SCHEDULE_KEY = GENERATE_RES.body.data.schedule.scheduleKey as string;

      const FIRST_TRANSITION = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(FIRST_TRANSITION.status).toBe(200);

      const COUNT_AFTER_FIRST = await PRISMA.match.count({ where: { tournamentId: TOURNAMENT.id } });
      expect(COUNT_AFTER_FIRST).toBe(3);

      // Se re-invoca directamente la materialización (mismo tournamentId + scheduleKey) para
      // simular un retry de la transacción — el estado machine (Slice A) ya impide alcanzar
      // este mismo camino dos veces vía el endpoint público IN_PROGRESS→IN_PROGRESS, así que
      // la garantía de idempotencia se prueba en el límite donde realmente vive (Design §8).
      const REPLAY_RESULT = await MATERIALIZATION_REPOSITORY.transitionAndMaterializeSV({
        tournamentId: TOURNAMENT.id,
        toStatus: 'IN_PROGRESS',
        scheduleKey: SCHEDULE_KEY,
        sportId,
        categoryId,
        organizerUserId,
        matchType: 'AMERICANO',
        matches: [
          {
            roundNumber: 99,
            matchNumber: 99,
            scheduledAt: null,
            courtId: null,
            participants: [
              { userId: organizerUserId, tournamentRegistrationId: 'replay-registration-a', teamLabel: 'A' },
              { userId: organizerUserId, tournamentRegistrationId: 'replay-registration-b', teamLabel: 'B' },
            ],
          },
        ],
      });

      expect(REPLAY_RESULT.created).toBe(false);
      expect(REPLAY_RESULT.matchCount).toBe(3);

      const COUNT_AFTER_REPLAY = await PRISMA.match.count({ where: { tournamentId: TOURNAMENT.id } });
      expect(COUNT_AFTER_REPLAY).toBe(3);
    });

    async function createGuestRegistrationSV(_tournamentId: string, _guestName: string) {
      const REG = await PRISMA.tournamentRegistration.create({
        data: {
          tournamentId: _tournamentId,
          registrationType: 'GUEST' as never,
          guestName: _guestName,
          registeredByUserId: organizerUserId,
          status: 'CONFIRMED',
        },
      });
      return REG.id;
    }

    it('materializes matches with mixed auth+guest registrationId tokens: guest rows get userId=null + tournamentRegistrationId set (Slice 1: tournament-guest-registration)', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Guest Materialize ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'DRAFT',
        },
      });

      const AUTH_A = await createConfirmedPlayerSV('guest-mat-auth-a', TOURNAMENT.id);
      const AUTH_B = await createConfirmedPlayerSV('guest-mat-auth-b', TOURNAMENT.id);
      await createGuestRegistrationSV(TOURNAMENT.id, 'Carlos Invitado');
      await createGuestRegistrationSV(TOURNAMENT.id, 'Marta Invitada');

      await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      const GENERATE_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(GENERATE_RES.status).toBe(201);

      const IN_PROGRESS_RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(IN_PROGRESS_RES.status).toBe(200);

      const MATCHES = await PRISMA.match.findMany({
        where: { tournamentId: TOURNAMENT.id },
        include: { participants: true },
      });
      expect(MATCHES.length).toBeGreaterThan(0);

      const ALL_PARTICIPANTS = MATCHES.flatMap((_m) => _m.participants);
      expect(ALL_PARTICIPANTS.length).toBeGreaterThan(0);

      //? No token queda sin resolver: toda fila tiene tournamentRegistrationId (auth o guest).
      for (const PARTICIPANT of ALL_PARTICIPANTS) {
        expect(PARTICIPANT.tournamentRegistrationId).not.toBeNull();
      }

      const AUTH_PARTICIPANTS = ALL_PARTICIPANTS.filter((_p) => _p.userId !== null);
      const GUEST_PARTICIPANTS = ALL_PARTICIPANTS.filter((_p) => _p.userId === null);
      expect(AUTH_PARTICIPANTS.length).toBeGreaterThan(0);
      expect(GUEST_PARTICIPANTS.length).toBeGreaterThan(0);
      expect(AUTH_PARTICIPANTS.every((_p) => [AUTH_A, AUTH_B].includes(_p.userId as string))).toBe(true);
    });

    it('responds 409 CALENDARIO_OBSOLETO when materializing a stale pre-Slice-1 schedule (userId tokens, not registrationId)', async () => {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo Stale Schedule ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'DRAFT',
        },
      });

      const STALE_A = await createConfirmedPlayerSV('stale-a', TOURNAMENT.id);
      const STALE_B = await createConfirmedPlayerSV('stale-b', TOURNAMENT.id);
      const STALE_C = await createConfirmedPlayerSV('stale-c', TOURNAMENT.id);
      const STALE_D = await createConfirmedPlayerSV('stale-d', TOURNAMENT.id);

      await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      //? Simula un TournamentSchedule generado antes de Slice 1 (tournament-guest-registration):
      //? el payload referencia `userId` directamente, no `TournamentRegistration.id`.
      await PRISMA.tournamentSchedule.create({
        data: {
          tournamentId: TOURNAMENT.id,
          formatCode: 'AMERICANO',
          scheduleKey: `americano:v1:${[STALE_A, STALE_B, STALE_C, STALE_D].sort().join(',')}`,
          payload: {
            rounds: [
              {
                roundNumber: 1,
                courts: [{ courtNumber: 1, teamA: [STALE_A, STALE_B], teamB: [STALE_C, STALE_D] }],
              },
            ],
          },
        },
      });

      const IN_PROGRESS_RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      expect(IN_PROGRESS_RES.status).toBe(409);
      expect(IN_PROGRESS_RES.body.code).toBe('CALENDARIO_OBSOLETO');

      const MATCH_COUNT = await PRISMA.match.count({ where: { tournamentId: TOURNAMENT.id } });
      expect(MATCH_COUNT).toBe(0);
      const TOURNAMENT_AFTER = await PRISMA.tournament.findUnique({ where: { id: TOURNAMENT.id } });
      expect(TOURNAMENT_AFTER?.status).toBe('OPEN');

      //? Re-disparar `schedule:generate` NO es la vía de recuperación: el scheduleKey derivado
      //? del roster actual (tokens registrationId) difiere del legado (tokens userId) persistido
      //? en la misma fila `TournamentSchedule` (única por torneo), así que
      //? `createOrValidateIdempotencySV` responde 409 `SCHEDULE_CONFLICT` en vez de sobrescribir.
      const REGENERATE_ATTEMPT_RES = await request(APP)
        .post(`/api/v1/tournaments/${TOURNAMENT.id}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(REGENERATE_ATTEMPT_RES.status).toBe(409);
      expect(REGENERATE_ATTEMPT_RES.body.code).toBe('SCHEDULE_CONFLICT');

      //? La vía de recuperación real es la migración de datos (`scripts/migrate-stale-tournament-schedules.ts`,
      //? locked decision: "auto-migration script + 409 fallback"): convierte los tokens `userId`
      //? del payload legado a `registrationId` in place, usando la misma función de dominio pura
      //? (`remapScheduleTokensSV`) que el script ejecuta contra la base real.
      const STALE_SCHEDULE = await PRISMA.tournamentSchedule.findUniqueOrThrow({
        where: { tournamentId: TOURNAMENT.id },
      });
      const REGISTRATIONS = await PRISMA.tournamentRegistration.findMany({
        where: { tournamentId: TOURNAMENT.id },
        select: { id: true, userId: true },
      });
      const TOKEN_MAP = new Map(
        REGISTRATIONS.filter((_r) => _r.userId !== null).map((_r) => [_r.userId as string, _r.id]),
      );
      await PRISMA.tournamentSchedule.update({
        where: { id: STALE_SCHEDULE.id },
        data: { payload: remapScheduleTokensSV(STALE_SCHEDULE.payload, TOKEN_MAP) as never },
      });

      const RETRY_IN_PROGRESS_RES = await request(APP)
        .patch(`/api/v1/tournaments/${TOURNAMENT.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(RETRY_IN_PROGRESS_RES.status).toBe(200);
    });
  },
);
