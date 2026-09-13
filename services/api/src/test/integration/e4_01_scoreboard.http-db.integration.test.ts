import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'US-E3-03 — Integración HTTP + DB: Tournament Scoreboard',
  () => {
    let categoryId: string;
    let sportPadelId: string;
    let presetRoundRobinId: string;
    let tournamentId: string;
    let otherTournamentId: string;

    let userAId: string;
    let userBId: string;
    let userCId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;
      presetRoundRobinId = CATALOG.presetRoundRobinId;

      const TS = Date.now();
      const CAT = await createTestCategorySV(sportPadelId, `e4-${TS}`, 'Cat E4');
      categoryId = CAT.id;

      const [UA, UB, UC] = await Promise.all([
        PRISMA.user.create({
          data: { email: `e4-a-${TS}@test.local`, name: 'Alice' },
        }),
        PRISMA.user.create({
          data: { email: `e4-b-${TS}@test.local`, name: 'Bob' },
        }),
        PRISMA.user.create({
          data: { email: `e4-c-${TS}@test.local`, name: 'Carol' },
        }),
      ]);
      userAId = UA.id;
      userBId = UB.id;
      userCId = UC.id;

      const TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo E4 ${TS}`,
          categoryId,
          sportId: sportPadelId,
          formatPresetId: presetRoundRobinId,
          presetSchemaVersion: 1,
          status: 'DRAFT',
        },
      });
      tournamentId = TOURNAMENT.id;

      const OTHER_TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo E4 other ${TS}`,
          categoryId,
          sportId: sportPadelId,
          formatPresetId: presetRoundRobinId,
          presetSchemaVersion: 1,
          status: 'DRAFT',
        },
      });
      otherTournamentId = OTHER_TOURNAMENT.id;

      // Match 1 (tournamentId): A=4, B=2
      const M1 = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId,
          organizerUserId: userAId,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      const R1 = await PRISMA.matchResult.create({ data: { matchId: M1.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: R1.id, userId: userAId, points: 4 },
          { resultId: R1.id, userId: userBId, points: 2 },
        ],
      });

      // Match 2 (tournamentId): A=3, C=3
      const M2 = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId,
          organizerUserId: userAId,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      const R2 = await PRISMA.matchResult.create({ data: { matchId: M2.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: R2.id, userId: userAId, points: 3 },
          { resultId: R2.id, userId: userCId, points: 3 },
        ],
      });

      // Match 3 (tournamentId): A=3, B=5, C=4
      const M3 = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId,
          organizerUserId: userAId,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      const R3 = await PRISMA.matchResult.create({ data: { matchId: M3.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: R3.id, userId: userAId, points: 3 },
          { resultId: R3.id, userId: userBId, points: 5 },
          { resultId: R3.id, userId: userCId, points: 4 },
        ],
      });

      // Control: match/result/scores in another tournament should NOT count.
      const M_OTHER = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId: otherTournamentId,
          organizerUserId: userAId,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      const R_OTHER = await PRISMA.matchResult.create({ data: { matchId: M_OTHER.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: R_OTHER.id, userId: userAId, points: 999 },
          { resultId: R_OTHER.id, userId: userBId, points: 999 },
          { resultId: R_OTHER.id, userId: userCId, points: 999 },
        ],
      });
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('GET scoreboard retorna array ordenado con puntos sumados, gamesPlayed y rank dense', async () => {
      const RES = await request(APP).get(`/api/v1/tournaments/${tournamentId}/scoreboard`);

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);

      //? El envelope es `data: { rows: [...] }`, no un array suelto: el
      //? `decodeEnvelopeDataMap` de mobile solo acepta objetos, y su
      //? TournamentScoreboardDto.fromJson lee `json['rows']`.
      expect(Array.isArray(RES.body.data.rows)).toBe(true);

      // Esperados por tournamentId (sin contar OTHER_TOURNAMENT):
      // Alice: 4+3+3 = 10, gamesPlayed=3, rank=1
      //   gamesWon: match1 (4>2, gana) + match2 (3=3, empate) + match3 (3, no es el máximo) = 1
      // Bob:   2+5   = 7,  gamesPlayed=2, rank=2
      //   gamesWon: match1 (2<4, pierde) + match3 (5, máximo) = 1
      // Carol: 3+4   = 7,  gamesPlayed=2, rank=2  (dense)
      //   gamesWon: match2 (3=3, empate) + match3 (4, no es el máximo) = 0
      const SCOREBOARD = RES.body.data.rows as Array<{
        userId: string;
        name: string;
        points: number;
        gamesPlayed: number;
        gamesWon: number;
        rank: number;
      }>;

      // Ordenado desc por points (primero debe ser Alice con 10).
      expect(SCOREBOARD[0]).toEqual({
        userId: userAId,
        name: 'Alice',
        points: 10,
        gamesPlayed: 3,
        gamesWon: 1,
        rank: 1,
      });

      const TIED = SCOREBOARD.slice(1).map((_r) => ({
        userId: _r.userId,
        name: _r.name,
        points: _r.points,
        gamesPlayed: _r.gamesPlayed,
        gamesWon: _r.gamesWon,
        rank: _r.rank,
      }));

      expect(TIED).toHaveLength(2);
      expect(TIED).toEqual(
        expect.arrayContaining([
          { userId: userBId, name: 'Bob', points: 7, gamesPlayed: 2, gamesWon: 1, rank: 2 },
          { userId: userCId, name: 'Carol', points: 7, gamesPlayed: 2, gamesWon: 0, rank: 2 },
        ]),
      );
    });

    it('GET scoreboard responde 404 si el torneo no existe', async () => {
      const RES = await request(APP).get(
        '/api/v1/tournaments/550e8400-e29b-41d4-a716-446655440099/scoreboard',
      );

      expect(RES.status).toBe(404);
      expect(RES.body.success).toBe(false);
      expect(RES.body.code).toBe('TORNEO_NO_ENCONTRADO');
    });

    it('GET scoreboard responde 200 con data=[] si el torneo existe sin resultados', async () => {
      const TS = Date.now();
      const EMPTY_TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo E3-03 vacío ${TS}`,
          categoryId,
          sportId: sportPadelId,
          formatPresetId: presetRoundRobinId,
          presetSchemaVersion: 1,
          status: 'DRAFT',
        },
      });

      const RES = await request(APP).get(
        `/api/v1/tournaments/${EMPTY_TOURNAMENT.id}/scoreboard`,
      );

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);
      expect(Array.isArray(RES.body.data.rows)).toBe(true);
      expect(RES.body.data.rows).toEqual([]);
    });

    //? Duplas: gamesWon debe sumar por MatchParticipant.teamLabel, nunca comparar
    //? filas individuales de MatchResultScore (que no tiene columna de lado).
    it('GET scoreboard aggregates gamesWon by side (teamLabel), not by individual row', async () => {
      const TS = Date.now();
      const DOUBLES_TOURNAMENT = await PRISMA.tournament.create({
        data: {
          name: `Torneo E4 duplas ${TS}`,
          categoryId,
          sportId: sportPadelId,
          formatPresetId: presetRoundRobinId,
          presetSchemaVersion: 1,
          status: 'DRAFT',
        },
      });

      const [A1, A2, B1, B2] = await Promise.all([
        PRISMA.user.create({ data: { email: `e4-a1-${TS}@test.local`, name: 'A1' } }),
        PRISMA.user.create({ data: { email: `e4-a2-${TS}@test.local`, name: 'A2' } }),
        PRISMA.user.create({ data: { email: `e4-b1-${TS}@test.local`, name: 'B1' } }),
        PRISMA.user.create({ data: { email: `e4-b2-${TS}@test.local`, name: 'B2' } }),
      ]);

      //? Partido 1 — empate por suma de lado: A=[15,15]=30, B=[20,10]=30.
      //? Ganaría B si se comparara la fila individual más alta (20), pero
      //? sumado por lado es un empate: nadie gana este partido.
      const MATCH_1 = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId: DOUBLES_TOURNAMENT.id,
          organizerUserId: A1.id,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      await PRISMA.matchParticipant.createMany({
        data: [
          { matchId: MATCH_1.id, userId: A1.id, teamLabel: 'A' },
          { matchId: MATCH_1.id, userId: A2.id, teamLabel: 'A' },
          { matchId: MATCH_1.id, userId: B1.id, teamLabel: 'B' },
          { matchId: MATCH_1.id, userId: B2.id, teamLabel: 'B' },
        ],
      });
      const RESULT_1 = await PRISMA.matchResult.create({ data: { matchId: MATCH_1.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: RESULT_1.id, userId: A1.id, points: 15 },
          { resultId: RESULT_1.id, userId: A2.id, points: 15 },
          { resultId: RESULT_1.id, userId: B1.id, points: 20 },
          { resultId: RESULT_1.id, userId: B2.id, points: 10 },
        ],
      });

      //? Partido 2 — A gana por suma de lado: A=[10,9]=19 vs B=[15,2]=17.
      //? B tiene la fila individual más alta (15) pero pierde por suma.
      const MATCH_2 = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          tournamentId: DOUBLES_TOURNAMENT.id,
          organizerUserId: A1.id,
          type: 'REGULAR',
          status: 'FINISHED',
        },
      });
      await PRISMA.matchParticipant.createMany({
        data: [
          { matchId: MATCH_2.id, userId: A1.id, teamLabel: 'A' },
          { matchId: MATCH_2.id, userId: A2.id, teamLabel: 'A' },
          { matchId: MATCH_2.id, userId: B1.id, teamLabel: 'B' },
          { matchId: MATCH_2.id, userId: B2.id, teamLabel: 'B' },
        ],
      });
      const RESULT_2 = await PRISMA.matchResult.create({ data: { matchId: MATCH_2.id } });
      await PRISMA.matchResultScore.createMany({
        data: [
          { resultId: RESULT_2.id, userId: A1.id, points: 10 },
          { resultId: RESULT_2.id, userId: A2.id, points: 9 },
          { resultId: RESULT_2.id, userId: B1.id, points: 15 },
          { resultId: RESULT_2.id, userId: B2.id, points: 2 },
        ],
      });

      const RES = await request(APP).get(
        `/api/v1/tournaments/${DOUBLES_TOURNAMENT.id}/scoreboard`,
      );

      expect(RES.status).toBe(200);
      const ROWS = RES.body.data.rows as Array<{
        userId: string;
        gamesPlayed: number;
        gamesWon: number;
      }>;
      const BY_USER_ID = new Map(ROWS.map((_r) => [_r.userId, _r]));

      // Empate del partido 1 (nadie gana) + partido 2 ganado por el lado A.
      expect(BY_USER_ID.get(A1.id)).toMatchObject({ gamesPlayed: 2, gamesWon: 1 });
      expect(BY_USER_ID.get(A2.id)).toMatchObject({ gamesPlayed: 2, gamesWon: 1 });
      // B pierde el partido 2 pese a la fila individual más alta (15).
      expect(BY_USER_ID.get(B1.id)).toMatchObject({ gamesPlayed: 2, gamesWon: 0 });
      expect(BY_USER_ID.get(B2.id)).toMatchObject({ gamesPlayed: 2, gamesWon: 0 });
    });
  },
);

