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
  participants: Array<{ userId: string | null; teamLabel: string | null }>;
};

//? S7c-2: integra contra Postgres real el avance automático de eliminación
//? simple (S7c-1) que las pruebas unitarias sólo simulan con mocks —
//? concurrencia real de `SELECT ... FOR UPDATE`, materialización de duplas
//? y el guard de empates (S7b), todos sobre el mismo cuadro generado por
//? `POST /schedule:generate`.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Tournament single-elimination advancement (HTTP + DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetSingleEliminationId: string;
    let organizerUserId: string;
    let organizerToken: string;
    let venueId: string;
    let courtId: string;
    let userSeq = 0;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;

      //? `ensureTestCatalogSV` sólo siembra AMERICANO/ROUND_ROBIN; el preset
      //? SINGLE_ELIMINATION no tiene alias ahí porque ningún test previo lo
      //? necesitaba contra DB real. Su `name` es literalmente el código
      //? porque `register_tournament_match_result.use_case.ts:103` y
      //? `get_tournament_bracket.use_case.ts:50` comparan `formatPresetName`
      //? (que en realidad expone `TournamentFormatPreset.name`) contra ese
      //? literal — mismo fixture que ya usan los unit tests existentes
      //? (`tournament_match_result.use_case.test.ts:224`).
      const PRESET = await PRISMA.tournamentFormatPreset.upsert({
        where: { sportId_code_version: { sportId, code: 'SINGLE_ELIMINATION', version: 1 } },
        create: {
          sportId,
          code: 'SINGLE_ELIMINATION',
          version: 1,
          name: 'SINGLE_ELIMINATION',
          schemaVersion: 1,
          defaultParameters: {},
          parametersSchema: FORMAT_PRESET_V1_PARAMETERS_SCHEMAS.SINGLE_ELIMINATION as unknown as Prisma.InputJsonValue,
        },
        update: {},
        select: { id: true },
      });
      presetSingleEliminationId = PRESET.id;

      const CAT = await createTestCategorySV(sportId, `s7c2-se-${Date.now()}`, 'Cat S7c2 SE');
      categoryId = CAT.id;

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `s7c2-organizer-${Date.now()}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
      organizerToken = signAccessTokenSV(ORGANIZER.id, ORGANIZER.email);

      const VENUE = await PRISMA.venue.create({
        data: { name: `Venue S7c2 ${Date.now()}`, latitude: -34.6, longitude: -58.4 },
      });
      venueId = VENUE.id;
      const COURT = await PRISMA.court.create({ data: { name: 'Court S7c2', venueId } });
      courtId = COURT.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createUserSV(_label: string): Promise<string> {
      userSeq += 1;
      const USER = await PRISMA.user.create({
        data: { email: `s7c2-${_label}-${userSeq}@test.local`, name: _label },
      });
      return USER.id;
    }

    async function createConfirmedSinglesSV(_tournamentId: string, _label: string): Promise<string> {
      const USER_ID = await createUserSV(_label);
      await PRISMA.tournamentRegistration.create({
        data: { tournamentId: _tournamentId, userId: USER_ID, status: 'CONFIRMED' },
      });
      return USER_ID;
    }

    //? Pareja fija (padel de duplas): dos inscripciones CONFIRMED apuntándose
    //? entre sí por `partnerRegistrationId`, igual que arma el organizador
    //? real (`assertPairableSV`), pero sin pasar por el endpoint de emparejar.
    async function createConfirmedPairSV(_tournamentId: string, _label: string): Promise<[string, string]> {
      const USER_A = await createUserSV(`${_label}-a`);
      const USER_B = await createUserSV(`${_label}-b`);
      const REG_A = await PRISMA.tournamentRegistration.create({
        data: { tournamentId: _tournamentId, userId: USER_A, status: 'CONFIRMED' },
      });
      const REG_B = await PRISMA.tournamentRegistration.create({
        data: { tournamentId: _tournamentId, userId: USER_B, status: 'CONFIRMED' },
      });
      await PRISMA.tournamentRegistration.update({
        where: { id: REG_A.id },
        data: { partnerRegistrationId: REG_B.id },
      });
      await PRISMA.tournamentRegistration.update({
        where: { id: REG_B.id },
        data: { partnerRegistrationId: REG_A.id },
      });
      return [USER_A, USER_B];
    }

    async function createSingleEliminationTournamentSV(_name: string, _paired: boolean): Promise<string> {
      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `${_name} ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetSingleEliminationId,
          organizerUserId,
          venueId,
          pairedRegistration: _paired,
          status: 'DRAFT',
        },
      });
      return TOURNAMENT.id;
    }

    //? Genera el cuadro y lleva el torneo a IN_PROGRESS, igual que
    //? `tournament_schedule_match_states.http-db.integration.test.ts`. La
    //? reserva automática de turno depende de disponibilidad real; se fuerza
    //? la cancha después para que el guard de resultados
    //? (`getVenueIdForTournamentSV`) resuelva la sede vía `Match.court`.
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
        include: { participants: { select: { userId: true, teamLabel: true } } },
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

    it('creates exactly one final with the correct winners after sequential semifinals, and rejects a retry without duplicating it', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Sequential', false);
      for (let i = 0; i < 4; i += 1) {
        await createConfirmedSinglesSV(TOURNAMENT_ID, `seq-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      const [SF1, SF2] = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      expect(SF1).toBeDefined();
      expect(SF2).toBeDefined();

      const SF1_WINNER = SF1!.participants[0]!.userId!;
      const SF1_LOSER = SF1!.participants[1]!.userId!;
      const RES1 = await recordResultSV(TOURNAMENT_ID, SF1!.id, [
        { userId: SF1_WINNER, points: 6 },
        { userId: SF1_LOSER, points: 2 },
      ]);
      expect(RES1.status).toBe(201);

      //? Todavía falta la otra semifinal: la final no puede existir aún.
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, 2)).toHaveLength(0);

      const SF2_WINNER = SF2!.participants[0]!.userId!;
      const SF2_LOSER = SF2!.participants[1]!.userId!;
      const RES2 = await recordResultSV(TOURNAMENT_ID, SF2!.id, [
        { userId: SF2_WINNER, points: 6 },
        { userId: SF2_LOSER, points: 3 },
      ]);
      expect(RES2.status).toBe(201);

      const FINALS = await fetchRoundMatchesSV(TOURNAMENT_ID, 2);
      expect(FINALS).toHaveLength(1);
      expect(FINALS[0]!.participants.map((_p) => _p.userId).sort()).toEqual(
        [SF1_WINNER, SF2_WINNER].sort(),
      );

      const RETRY = await recordResultSV(TOURNAMENT_ID, SF2!.id, [
        { userId: SF2_WINNER, points: 6 },
        { userId: SF2_LOSER, points: 1 },
      ]);
      expect(RETRY.status).toBe(409);
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, 2)).toHaveLength(1);
    });

    async function fetchBracketSV(_tournamentId: string) {
      const RES = await request(APP)
        .get(`/api/v1/tournaments/${_tournamentId}/bracket`)
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(RES.status).toBe(200);
      return RES.body.data as {
        rounds: Array<{
          roundNumber: number;
          matches: Array<{
            matchNumber: number;
            matchId: string | null;
            status: string;
            winnerId: string | null;
            score: Array<{ userId: string; points: number }> | null;
          }>;
        }>;
      };
    }

    it('reflects real matchId/status/winnerId/score in the bracket once a semifinal is played, keeping the other slot in preview (S8b)', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Bracket Real State', false);
      for (let i = 0; i < 4; i += 1) {
        await createConfirmedSinglesSV(TOURNAMENT_ID, `real-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      //? `generateAndStartScheduleSV` ya materializa los Match de ronda 1 al
      //? pasar a IN_PROGRESS: no hay un estado "sin calendario" que probar acá
      //? (ver los tests unitarios para ese caso) — lo real de este slot es
      //? SCHEDULED (bracket: PENDING) con matchId ya asignado, sin ganador.
      const BEFORE_RESULT = await fetchBracketSV(TOURNAMENT_ID);
      const BEFORE_ROUND_1 = BEFORE_RESULT.rounds.find((_r) => _r.roundNumber === 1)!;
      for (const MATCH of BEFORE_ROUND_1.matches) {
        expect(MATCH.matchId).not.toBeNull();
        expect(MATCH.status).toBe('PENDING');
        expect(MATCH.winnerId).toBeNull();
        expect(MATCH.score).toBeNull();
      }
      //? La final todavía no se materializó (ninguna semifinal se jugó): sigue en preview.
      const BEFORE_ROUND_2 = BEFORE_RESULT.rounds.find((_r) => _r.roundNumber === 2)!;
      expect(BEFORE_ROUND_2.matches[0]!.matchId).toBeNull();
      expect(BEFORE_ROUND_2.matches[0]!.status).toBe('PENDING');

      const [SF1, SF2] = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      const SF1_WINNER = SF1!.participants[0]!.userId!;
      const SF1_LOSER = SF1!.participants[1]!.userId!;
      const RES1 = await recordResultSV(TOURNAMENT_ID, SF1!.id, [
        { userId: SF1_WINNER, points: 6 },
        { userId: SF1_LOSER, points: 2 },
      ]);
      expect(RES1.status).toBe(201);

      const SF1_MATCH_NUMBER = (SF1!.formatParameters as { matchNumber: number }).matchNumber;
      const SF2_MATCH_NUMBER = (SF2!.formatParameters as { matchNumber: number }).matchNumber;

      const AFTER = await fetchBracketSV(TOURNAMENT_ID);
      const AFTER_ROUND_1 = AFTER.rounds.find((_r) => _r.roundNumber === 1)!;
      const SF1_SLOT = AFTER_ROUND_1.matches.find((_m) => _m.matchNumber === SF1_MATCH_NUMBER)!;
      expect(SF1_SLOT.matchId).toBe(SF1!.id);
      expect(SF1_SLOT.status).toBe('COMPLETED');
      expect(SF1_SLOT.winnerId).toBe(SF1_WINNER);
      expect(SF1_SLOT.score).toEqual(
        expect.arrayContaining([
          { userId: SF1_WINNER, points: 6 },
          { userId: SF1_LOSER, points: 2 },
        ]),
      );

      const SF2_SLOT = AFTER_ROUND_1.matches.find((_m) => _m.matchNumber === SF2_MATCH_NUMBER)!;
      expect(SF2_SLOT.matchId).toBe(SF2!.id);
      expect(SF2_SLOT.status).toBe('PENDING');
      expect(SF2_SLOT.winnerId).toBeNull();
      expect(SF2_SLOT.score).toBeNull();

      // La final todavía no se materializó (falta la otra semifinal): sigue en preview.
      const AFTER_ROUND_2 = AFTER.rounds.find((_r) => _r.roundNumber === 2)!;
      expect(AFTER_ROUND_2.matches[0]!.matchId).toBeNull();
      expect(AFTER_ROUND_2.matches[0]!.status).toBe('PENDING');
    });

    it('advances the winning doubles side by point sum, materializing both userIds with a re-derived teamLabel', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Doubles', true);
      for (let i = 0; i < 4; i += 1) {
        await createConfirmedPairSV(TOURNAMENT_ID, `pair-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      const [SF1, SF2] = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      expect(SF1).toBeDefined();
      expect(SF2).toBeDefined();

      const SF1_SIDE_A = SF1!.participants.filter((_p) => _p.teamLabel === 'A');
      const SF1_SIDE_B = SF1!.participants.filter((_p) => _p.teamLabel === 'B');
      expect(SF1_SIDE_A).toHaveLength(2);
      expect(SF1_SIDE_B).toHaveLength(2);

      //? Suma por lado, no el máximo individual (misma regla que S7b): lado A
      //? suma 19 (10+9) y gana, aunque el lado B tenga el puntaje individual
      //? más alto de la cancha (15).
      const RES1 = await recordResultSV(TOURNAMENT_ID, SF1!.id, [
        { userId: SF1_SIDE_A[0]!.userId!, points: 10 },
        { userId: SF1_SIDE_A[1]!.userId!, points: 9 },
        { userId: SF1_SIDE_B[0]!.userId!, points: 15 },
        { userId: SF1_SIDE_B[1]!.userId!, points: 2 },
      ]);
      expect(RES1.status).toBe(201);
      const SF1_WINNER_USER_IDS = SF1_SIDE_A.map((_p) => _p.userId!).sort();

      const SF2_SIDE_A = SF2!.participants.filter((_p) => _p.teamLabel === 'A');
      const SF2_SIDE_B = SF2!.participants.filter((_p) => _p.teamLabel === 'B');
      const RES2 = await recordResultSV(TOURNAMENT_ID, SF2!.id, [
        { userId: SF2_SIDE_A[0]!.userId!, points: 6 },
        { userId: SF2_SIDE_A[1]!.userId!, points: 6 },
        { userId: SF2_SIDE_B[0]!.userId!, points: 2 },
        { userId: SF2_SIDE_B[1]!.userId!, points: 3 },
      ]);
      expect(RES2.status).toBe(201);
      const SF2_WINNER_USER_IDS = SF2_SIDE_A.map((_p) => _p.userId!).sort();

      const FINALS = await fetchRoundMatchesSV(TOURNAMENT_ID, 2);
      expect(FINALS).toHaveLength(1);
      const FINAL_SIDE_A = FINALS[0]!.participants.filter((_p) => _p.teamLabel === 'A');
      const FINAL_SIDE_B = FINALS[0]!.participants.filter((_p) => _p.teamLabel === 'B');
      expect(FINAL_SIDE_A).toHaveLength(2);
      expect(FINAL_SIDE_B).toHaveLength(2);
      expect([...FINAL_SIDE_A, ...FINAL_SIDE_B].map((_p) => _p.userId!).sort()).toEqual(
        [...SF1_WINNER_USER_IDS, ...SF2_WINNER_USER_IDS].sort(),
      );
    });

    it('creates exactly one final when both semifinals are recorded concurrently', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Concurrent', false);
      for (let i = 0; i < 4; i += 1) {
        await createConfirmedSinglesSV(TOURNAMENT_ID, `conc-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      const ROUND1 = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      expect(ROUND1).toHaveLength(2);

      const OUTCOMES = await Promise.allSettled(
        ROUND1.map((_match) =>
          recordResultSV(TOURNAMENT_ID, _match.id, [
            { userId: _match.participants[0]!.userId!, points: 6 },
            { userId: _match.participants[1]!.userId!, points: 2 },
          ]),
        ),
      );
      for (const OUTCOME of OUTCOMES) {
        expect(OUTCOME.status).toBe('fulfilled');
        if (OUTCOME.status === 'fulfilled') expect(OUTCOME.value.status).toBe(201);
      }

      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, 2)).toHaveLength(1);
    });

    it('auto-advances a bye without a recorded result once the other semifinal is played', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Bye', false);
      for (let i = 0; i < 3; i += 1) {
        await createConfirmedSinglesSV(TOURNAMENT_ID, `bye-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      //? Un cuadro de 3 competidores usa bracketSize=4: un partido real y un
      //? bye. El bye nunca materializa un Match
      //? (`tournament_match_materialization.ts:83`), así que la ronda 1 sólo
      //? tiene una fila.
      const ROUND1 = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      expect(ROUND1).toHaveLength(1);
      const REAL_MATCH = ROUND1[0]!;
      expect(REAL_MATCH.participants).toHaveLength(2);

      const RES = await recordResultSV(TOURNAMENT_ID, REAL_MATCH.id, [
        { userId: REAL_MATCH.participants[0]!.userId!, points: 6 },
        { userId: REAL_MATCH.participants[1]!.userId!, points: 1 },
      ]);
      expect(RES.status).toBe(201);

      const FINALS = await fetchRoundMatchesSV(TOURNAMENT_ID, 2);
      expect(FINALS).toHaveLength(1);
      expect(FINALS[0]!.participants).toHaveLength(2);
    });

    it('rejects a tied single-elimination result with 400 and writes nothing', async () => {
      const TOURNAMENT_ID = await createSingleEliminationTournamentSV('SE Tie', false);
      for (let i = 0; i < 2; i += 1) {
        await createConfirmedSinglesSV(TOURNAMENT_ID, `tie-${i}`);
      }
      await generateAndStartScheduleSV(TOURNAMENT_ID);

      const ROUND1 = await fetchRoundMatchesSV(TOURNAMENT_ID, 1);
      expect(ROUND1).toHaveLength(1);
      const MATCH = ROUND1[0]!;

      const RES = await recordResultSV(TOURNAMENT_ID, MATCH.id, [
        { userId: MATCH.participants[0]!.userId!, points: 5 },
        { userId: MATCH.participants[1]!.userId!, points: 5 },
      ]);
      expect(RES.status).toBe(400);

      expect(await PRISMA.matchResult.findMany({ where: { matchId: MATCH.id } })).toHaveLength(0);
      expect(await fetchRoundMatchesSV(TOURNAMENT_ID, 2)).toHaveLength(0);
    });
  },
);
