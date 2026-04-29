import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 31 — Catálogo multi-sport (Integración HTTP + DB)', () => {
  let sport1Id: string;
  let sport2Id: string;
  let presetSport2Id: string;
  let categoryId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();

    // Nota (TDD Red): hoy el seed helper solo asegura PADEL.
    // Este test asume ampliación a multi-sport y debe fallar hasta implementarla.
    const CATALOG = (await ensureTestCatalogSV()) as unknown as {
      sportPadelId: string;
      sportSecondId?: string;
      sportTennisId?: string;
      presetSecondRoundRobinId?: string;
      presetTennisRoundRobinId?: string;
    };

    sport1Id = CATALOG.sportPadelId;
    sport2Id = (CATALOG.sportTennisId ?? CATALOG.sportSecondId) as string;
    presetSport2Id = (CATALOG.presetTennisRoundRobinId ?? CATALOG.presetSecondRoundRobinId) as string;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat S31', slug: `s31-${Date.now()}` },
      select: { id: true },
    });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('con seed ejecutado: GET /api/v1/sports devuelve >=2', async () => {
    const RES = await request(APP).get('/api/v1/sports');

    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
    expect(Array.isArray(RES.body.data.sports)).toBe(true);
    expect((RES.body.data.sports as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it('GET presets por sport devuelve items y no mezcla sportId', async () => {
    expect(sport2Id).toBeDefined();

    const [RES_1, RES_2] = await Promise.all([
      request(APP).get(`/api/v1/sports/${sport1Id}/tournament-format-presets`),
      request(APP).get(`/api/v1/sports/${sport2Id}/tournament-format-presets`),
    ]);

    expect(RES_1.status).toBe(200);
    expect(RES_2.status).toBe(200);

    const PRESETS_1 = RES_1.body.data.presets as { id: string; sportId: string }[];
    const PRESETS_2 = RES_2.body.data.presets as { id: string; sportId: string }[];

    expect(PRESETS_1.length).toBeGreaterThan(0);
    expect(PRESETS_2.length).toBeGreaterThan(0);

    expect(PRESETS_1.every((_p) => _p.sportId === sport1Id)).toBe(true);
    expect(PRESETS_2.every((_p) => _p.sportId === sport2Id)).toBe(true);

    const IDS_1 = new Set(PRESETS_1.map((_p) => _p.id));
    const IDS_2 = new Set(PRESETS_2.map((_p) => _p.id));
    const INTERSECTION = [...IDS_1].filter((_id) => IDS_2.has(_id));
    expect(INTERSECTION).toHaveLength(0);
  });

  it('crear match y torneo con sportId diferente funciona', async () => {
    expect(sport2Id).toBeDefined();
    expect(presetSport2Id).toBeDefined();

    const TS = Date.now();
    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `s31-${TS}@test.local`, password: 'password123', name: 'User S31' })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);
    const USER_ID = REG.body.data.user.id as string;

    const MATCH = await PRISMA.match.create({
      data: {
        sportId: sport2Id,
        categoryId,
        organizerUserId: USER_ID,
        type: 'REGULAR',
        scheduledAt: new Date(Date.now() + 60_000),
      },
      select: { id: true, sportId: true },
    });
    expect(MATCH.id).toBeDefined();
    expect(MATCH.sportId).toBe(sport2Id);

    const TOURNAMENT = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo S31 (sport2)',
        categoryId,
        sportId: sport2Id,
        formatPresetId: presetSport2Id,
      })
      .set('Content-Type', 'application/json');

    expect(TOURNAMENT.status).toBe(201);
    expect(TOURNAMENT.body.data.tournamentId).toBeDefined();
    expect(TOURNAMENT.body.data.sportId).toBe(sport2Id);
    expect(TOURNAMENT.body.data.formatPresetId).toBe(presetSport2Id);
  });
});

