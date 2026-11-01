import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { FORMAT_PRESET_V1_PARAMETERS_SCHEMAS } from '../../domain/services/tournament/format_preset_parameters_catalog.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

type MatchWithParticipantsSV = {
  id: string;
  formatParameters: unknown;
  participants: Array<{ userId: string | null; tournamentRegistrationId: string | null; teamLabel: string | null }>;
};

//? Issue #88: a diferencia de SINGLE_ELIMINATION (S7c-1), nada propagaba los
//? ganadores de semifinal hacia la Final de GROUPS_PLUS_KNOCKOUT — quedaba en
//? TBD para siempre. Mismo patrón HTTP+DB real que
//? `tournament_match_advancement.http-db.integration.test.ts`.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament GROUPS_PLUS_KNOCKOUT final advancement (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetGroupsPlusKnockoutId: string;
    let organizerUserId: string;
    let organizerToken: string;
    let venueId: string;
    let courtId: string;
    let userSeq = 0;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      const PRESET = await PRISMA.tournamentFormatPreset.upsert({
        where: { sportId_code_version: { sportId, code: 'GROUPS_PLUS_KNOCKOUT', version: 1 } },
        create: {
          sportId,
          code: 'GROUPS_PLUS_KNOCKOUT',
          version: 1,
          name: 'GROUPS_PLUS_KNOCKOUT',
          schemaVersion: 1,
          defaultParameters: {},
          parametersSchema: FORMAT_PRESET_V1_PARAMETERS_SCHEMAS.GROUPS_PLUS_KNOCKOUT as unknown as Prisma.InputJsonValue,
        },
        update: {},
        select: { id: true },
      });
      presetGroupsPlusKnockoutId = PRESET.id;

      const CAT = await createTestCategorySV(sportId, `issue88-gpk-${Date.now()}`, 'Cat Issue88 GPK');
      categoryId = CAT.id;

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `issue88-organizer-${Date.now()}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);

      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue Issue88 ${Date.now()}`, latitude: -34.6, longitude: -58.4 },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({ data: { name: 'Court Issue88', venueId } });
      courtId = COURT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createConfirmedSinglesSV(_tournamentId: string, _label: string): Promise<string> {
      userSeq += 1;
      const USER = await PRISMA.user.create({
        data: { email: `issue88-${_label}-${userSeq}@test.local`, name: _label },
      });
      await PRISMA.tournamentRegistration.create({
        data: { tournamentId: _tournamentId, userId: USER.id, status: 'CONFIRMED' },
      });
      return USER.id;
    }

    async function createGroupsPlusKnockoutTournamentSV(_name: string): Promise<string> {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `${_name} ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetGroupsPlusKnockoutId,
          organizerUserId,
          venueId,
          pairedRegistration: false,
          status: 'DRAFT',
        },
      });
      return TOURNAMENT.id;
    }

    //? 4 inscritos: 2 grupos de 2, ambos clasifican (mínimo v1). Cada grupo
    //? round-robin de 2 jugadores es un único partido, materializado de una al
    //? pasar a IN_PROGRESS (`buildMaterializedMatchPlansSV`, formato GPK).
    async function generateAndStartScheduleSV(_tournamentId: string): Promise<void> {
      await request(APP)
        .patch(`/api/v1/tournaments/${_tournamentId}/status`)
        .send({ status: 'OPEN' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      const GENERATE_RES = await request(APP)
        .post(`/api/v1/tournaments/${_tournamentId}/schedule:generate`)
        .send({})
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');
      expect(GENERATE_RES.status).toBe(201);

      await request(APP)
        .patch(`/api/v1/tournaments/${_tournamentId}/status`)
        .send({ status: 'IN_PROGRESS' })
        .set('Authorization', `Bearer ${organizerToken}`)
        .set('Content-Type', 'application/json');

      await PRISMA.match.updateMany({ where: { tournamentId: _tournamentId }, data: { courtId } });
    }

    async function fetchRoundMatchesSV(
      _tournamentId: string,
      _roundNumber: number,
    ): Promise<MatchWithParticipantsSV[]> {
      const MATCHES = await PRISMA.match.findMany({
        where: {
          tournamentId: _tournamentId,
          formatParameters: { path: ['roundNumber'], equals: _roundNumber },
        },
        include: { participants: { select: { userId: true, tournamentRegistrationId: true, teamLabel: true } } },
      });
      return MATCHES.sort(
        (_a, _b) =>
          (_a.formatParameters as { matchNumber: number }).matchNumber -
          (_b.formatParameters as { matchNumber: number }).matchNumber,
      );
    }

    async function recordResultSV(
      _tournamentId: string,
      _matchId: string,
      _scores: Array<{ userId: string; points: number }>,
    ) {
      return request(APP)
        .post(`/api/v1/tournaments/${_tournamentId}/matches/${_matchId}/results`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ scores: _scores })
        .set('Content-Type', 'application/json');
    }

    async function advanceSV(_tournamentId: string) {
      return request(APP)
        .post(`/api/v1/tournaments/${_tournamentId}/schedule:advance-groups-plus-knockout`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({})
        .set('Content-Type', 'application/json');
    }

    it('materializes the Final with the two semifinal winners once both are played, and rejects a retry without duplicating it', async () => {
      const TOURNAMENT_ID = await createGroupsPlusKnockoutTournamentSV('GPK Final Advancement');
      const PLAYERS = await Promise.all(
        [0, 1, 2, 3].map((_i) => createConfirmedSinglesSV(TOURNAMENT_ID, `gpk-${_i}`)),
      );
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      //? Un partido por grupo (rondas 1 y 2 del payload GPK): juega ambos para
      //? que `AdvanceGroupsPlusKnockoutUseCase` pueda avanzar a semifinales.
      const GROUP_MATCH_1 = (await fetchRoundMatchesSV(TOURNAMENT_ID, 1))[0]!;
      const GROUP_MATCH_2 = (await fetchRoundMatchesSV(TOURNAMENT_ID, 2))[0]!;
      await recordResultSV(TOURNAMENT_ID, GROUP_MATCH_1.id, [
        { userId: GROUP_MATCH_1.participants[0]!.userId!, points: 6 },
        { userId: GROUP_MATCH_1.participants[1]!.userId!, points: 2 },
      ]);
      await recordResultSV(TOURNAMENT_ID, GROUP_MATCH_2.id, [
        { userId: GROUP_MATCH_2.participants[0]!.userId!, points: 6 },
        { userId: GROUP_MATCH_2.participants[1]!.userId!, points: 3 },
      ]);

      const ADVANCE_RES = await advanceSV(TOURNAMENT_ID);
      expect(ADVANCE_RES.status).toBe(200);
      expect(ADVANCE_RES.body.data.phase).toBe('KNOCKOUT');

      const SEMIFINAL_ROUND_NUMBER = ADVANCE_RES.body.data.payload.knockout.semifinalRoundNumber;
      const FINAL_ROUND_NUMBER = ADVANCE_RES.body.data.payload.knockout.finalRoundNumber;

      const [SF1, SF2] = await fetchRoundMatchesSV(TOURNAMENT_ID, SEMIFINAL_ROUND_NUMBER);
      expect(SF1).toBeDefined();
      expect(SF2).toBeDefined();

      //? La Final no existe todavía: falta jugar ambas semifinales.
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, FINAL_ROUND_NUMBER)).toHaveLength(0);

      const SF1_WINNER = SF1!.participants[0]!.userId!;
      const SF1_LOSER = SF1!.participants[1]!.userId!;
      const RES1 = await recordResultSV(TOURNAMENT_ID, SF1!.id, [
        { userId: SF1_WINNER, points: 6 },
        { userId: SF1_LOSER, points: 2 },
      ]);
      expect(RES1.status).toBe(201);

      //? Todavía falta la otra semifinal: la Final sigue sin existir (issue #88).
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, FINAL_ROUND_NUMBER)).toHaveLength(0);

      const SF2_WINNER = SF2!.participants[0]!.userId!;
      const SF2_LOSER = SF2!.participants[1]!.userId!;
      const RES2 = await recordResultSV(TOURNAMENT_ID, SF2!.id, [
        { userId: SF2_WINNER, points: 6 },
        { userId: SF2_LOSER, points: 3 },
      ]);
      expect(RES2.status).toBe(201);

      const FINALS = await fetchRoundMatchesSV(TOURNAMENT_ID, FINAL_ROUND_NUMBER);
      expect(FINALS).toHaveLength(1);
      expect(FINALS[0]!.participants.map((_p) => _p.userId).sort()).toEqual(
        [SF1_WINNER, SF2_WINNER].sort(),
      );
      //? Los 4 jugadores originales siguen siendo los únicos del torneo —
      //? nadie inventado por el avance.
      expect(PLAYERS).toContain(SF1_WINNER);
      expect(PLAYERS).toContain(SF2_WINNER);

      const RETRY = await recordResultSV(TOURNAMENT_ID, SF2!.id, [
        { userId: SF2_WINNER, points: 6 },
        { userId: SF2_LOSER, points: 1 },
      ]);
      expect(RETRY.status).toBe(409);
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, FINAL_ROUND_NUMBER)).toHaveLength(1);
    });

    it('does not materialize a Final for a SINGLE_ELIMINATION-like tournament with no GPK schedule (regression: advancement stays format-gated)', async () => {
      //? Regresión mínima: un torneo sin TournamentSchedule en absoluto (nunca
      //? generó calendario) no debe romper el nuevo avance — debe comportarse
      //? exactamente como antes (no-op), igual que ya hace el avance SE.
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `No Schedule ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetGroupsPlusKnockoutId,
          organizerUserId,
          venueId,
          pairedRegistration: false,
          status: 'DRAFT',
        },
      });
      const USER_A = await createConfirmedSinglesSV(TOURNAMENT.id, 'noschedule-a');
      const USER_B = await createConfirmedSinglesSV(TOURNAMENT.id, 'noschedule-b');
      const MATCH = await PRISMA.match.create({
        data: {
          sportId,
          categoryId,
          organizerUserId,
          tournamentId: TOURNAMENT.id,
          type: 'REGULAR',
          status: 'SCHEDULED',
          maxParticipants: 2,
          courtId,
          participants: {
            create: [
              { userId: USER_A, tournamentRegistrationId: (await PRISMA.tournamentRegistration.findFirstOrThrow({ where: { tournamentId: TOURNAMENT.id, userId: USER_A } })).id },
              { userId: USER_B, tournamentRegistrationId: (await PRISMA.tournamentRegistration.findFirstOrThrow({ where: { tournamentId: TOURNAMENT.id, userId: USER_B } })).id },
            ],
          },
        },
      });

      const RES = await recordResultSV(TOURNAMENT.id, MATCH.id, [
        { userId: USER_A, points: 6 },
        { userId: USER_B, points: 2 },
      ]);
      expect(RES.status).toBe(201);
      //? No-op: ningún Match nuevo se crea cuando el torneo no tiene un
      //? TournamentSchedule GPK (ambos avances — SE y GPK — deben leer
      //? `null` y retornar sin materializar nada).
      expect(await PRISMA.match.count({ where: { tournamentId: TOURNAMENT.id } })).toBe(1);
    });
  },
);
