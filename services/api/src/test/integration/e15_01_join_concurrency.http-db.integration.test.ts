import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Sprint 15 — E2 hardening: Join atómico + cupos (Integración HTTP + DB)', () => {
  let sportPadelId: string;
  let categoryId: string;

  async function createUserSV(_label: string, _ts: number): Promise<{ token: string; userId: string }> {
    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e15-${_label}-${_ts}@test.local`, password: 'password123', name: `User ${_label}` })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);
    return { token: REG.body.data.accessToken as string, userId: REG.body.data.user.id as string };
  }

  async function createMatchSV(_token: string, _maxParticipants: number): Promise<string> {
    const CREATE = await request(APP)
      .post('/api/v1/matches')
      .set('Authorization', `Bearer ${_token}`)
      .send({ sportId: sportPadelId, categoryId, type: 'REGULAR', maxParticipants: _maxParticipants })
      .set('Content-Type', 'application/json');
    expect(CREATE.status).toBe(201);
    return CREATE.body.data.id as string;
  }

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportPadelId = CATALOG.sportPadelId;

    const TS = Date.now();
    const CAT = await PRISMA.category.create({ data: { name: 'Cat E15', slug: `e15-${TS}` } });
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('concurrencia: si queda 1 cupo, solo 1 join entra; resto 409 PARTIDO_LLENO', async () => {
    const TS = Date.now();

    const OWNER = await createUserSV('owner', TS);
    await PRISMA.userCategory.create({ data: { userId: OWNER.userId, categoryId } });

    // maxParticipants=2 => al crear, el organizer queda como participante (1 cupo ocupado).
    const MATCH_ID = await createMatchSV(OWNER.token, 2);
    const BEFORE = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(BEFORE).toBe(1);

    const JOINERS = await Promise.all(
      ['A', 'B', 'C', 'D', 'E'].map(async (_label) => {
        const U = await createUserSV(`join-${_label}`, TS);
        await PRISMA.userCategory.create({ data: { userId: U.userId, categoryId } });
        return U;
      }),
    );

    const RESULTS = await Promise.all(
      JOINERS.map(async (_u) => {
        const RES = await request(APP)
          .post(`/api/v1/matches/${MATCH_ID}/join`)
          .set('Authorization', `Bearer ${_u.token}`);
        return { status: RES.status, code: RES.body?.code as string | undefined };
      }),
    );

    const OKS = RESULTS.filter((_r) => _r.status === 200);
    const CONFLICTS = RESULTS.filter((_r) => _r.status === 409);

    expect(OKS.length).toBe(1);
    expect(CONFLICTS.length).toBe(JOINERS.length - 1);
    for (const _c of CONFLICTS) {
      expect(_c.code).toBe('PARTIDO_LLENO');
    }

    const AFTER = await PRISMA.matchParticipant.count({ where: { matchId: MATCH_ID } });
    expect(AFTER).toBe(2);
  });
});

