import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

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
      const CAT = await PRISMA.category.create({
        data: { name: 'Cat E4', slug: `e4-${TS}` },
      });
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

      // Según spec, data debe ser un array (o vacío si no hay resultados).
      expect(Array.isArray(RES.body.data)).toBe(true);

      // Esperados por tournamentId (sin contar OTHER_TOURNAMENT):
      // Alice: 4+3+3 = 10, gamesPlayed=3, rank=1
      // Bob:   2+5   = 7,  gamesPlayed=2, rank=2
      // Carol: 3+4   = 7,  gamesPlayed=2, rank=2  (dense)
      const SCOREBOARD = RES.body.data as Array<{
        userId: string;
        name: string;
        points: number;
        gamesPlayed: number;
        rank: number;
      }>;

      // Ordenado desc por points (primero debe ser Alice con 10).
      expect(SCOREBOARD[0]).toEqual({
        userId: userAId,
        name: 'Alice',
        points: 10,
        gamesPlayed: 3,
        rank: 1,
      });

      const TIED = SCOREBOARD.slice(1).map((_r) => ({
        userId: _r.userId,
        name: _r.name,
        points: _r.points,
        gamesPlayed: _r.gamesPlayed,
        rank: _r.rank,
      }));

      expect(TIED).toHaveLength(2);
      expect(TIED).toEqual(
        expect.arrayContaining([
          { userId: userBId, name: 'Bob', points: 7, gamesPlayed: 2, rank: 2 },
          { userId: userCId, name: 'Carol', points: 7, gamesPlayed: 2, rank: 2 },
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
      expect(Array.isArray(RES.body.data)).toBe(true);
      expect(RES.body.data).toEqual([]);
    });
  },
);

