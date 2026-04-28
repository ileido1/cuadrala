import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('US-E3-02 — Integración HTTP + DB: schedule Americano (idempotente)', () => {
  let categoryId: string;
  let userIds: string[];
  let tournamentId: string;
  let sportPadelId: string;
  let presetAmericanoId: string;
  let extraUserId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;
    presetAmericanoId = CATALOG.presetAmericanoId;

    const CAT = await PRISMA.category.create({
      data: { name: 'Cat E3', slug: `e3-${Date.now()}` },
    });
    categoryId = CAT.id;

    const TS = Date.now();
    const USERS = await Promise.all(
      Array.from({ length: 8 }).map(async (_v, _idx) => {
        const U = await PRISMA.user.create({
          data: { email: `e3-u${_idx}-${TS}@test.local`, name: `Usuario ${_idx}` },
        });
        return U.id;
      }),
    );
    userIds = USERS;

    const EXTRA = await PRISMA.user.create({
      data: { email: `e3-u-extra-${TS}@test.local`, name: `Usuario extra` },
    });
    extraUserId = EXTRA.id;

    const TOURNAMENT = await PRISMA.tournament.create({
      data: {
        name: `Torneo E3 ${Date.now()}`,
        categoryId,
        sportId: sportPadelId,
        formatPresetId: presetAmericanoId,
        presetSchemaVersion: 1,
        status: 'DRAFT',
      },
    });
    tournamentId = TOURNAMENT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST generate crea schedule por torneo; repetir POST es idempotente; GET devuelve lo mismo', async () => {
    const GEN1 = await request(APP)
      .post(`/api/v1/tournaments/${tournamentId}/americano-schedule:generate`)
      .send({ participantUserIds: userIds })
      .set('Content-Type', 'application/json');

    expect(GEN1.status).toBe(201);
    expect(GEN1.body.success).toBe(true);
    expect(GEN1.body.data?.tournamentId).toBe(tournamentId);
    expect(GEN1.body.data?.scheduleKey).toBeDefined();
    expect(GEN1.body.data?.schedule).toBeDefined();

    const ROW1 = await PRISMA.tournamentAmericanoSchedule.findUnique({ where: { tournamentId } });
    expect(ROW1).not.toBeNull();
    expect(ROW1?.scheduleKey).toBe(GEN1.body.data?.scheduleKey);

    const GEN2 = await request(APP)
      .post(`/api/v1/tournaments/${tournamentId}/americano-schedule:generate`)
      .send({ participantUserIds: userIds })
      .set('Content-Type', 'application/json');

    expect(GEN2.status).toBe(201);
    expect(GEN2.body.success).toBe(true);
    expect(GEN2.body.data?.tournamentId).toBe(tournamentId);
    expect(GEN2.body.data?.scheduleKey).toBe(GEN1.body.data?.scheduleKey);
    expect(GEN2.body.data?.schedule).toEqual(GEN1.body.data?.schedule);

    const GET = await request(APP).get(`/api/v1/tournaments/${tournamentId}/americano-schedule`);
    expect(GET.status).toBe(200);
    expect(GET.body.success).toBe(true);
    expect(GET.body.data?.tournamentId).toBe(tournamentId);
    expect(GET.body.data?.scheduleKey).toBe(GEN1.body.data?.scheduleKey);
    expect(GET.body.data?.schedule).toEqual(GEN1.body.data?.schedule);
  });

  it('POST generate responde 409 si ya existe schedule y el input (scheduleKey) es distinto', async () => {
    const IDS_ALT = [...userIds];
    IDS_ALT[IDS_ALT.length - 1] = extraUserId;

    const CONFLICT = await request(APP)
      .post(`/api/v1/tournaments/${tournamentId}/americano-schedule:generate`)
      .send({ participantUserIds: IDS_ALT })
      .set('Content-Type', 'application/json');

    expect(CONFLICT.status).toBe(409);
    expect(CONFLICT.body.success).toBe(false);
  });
});

