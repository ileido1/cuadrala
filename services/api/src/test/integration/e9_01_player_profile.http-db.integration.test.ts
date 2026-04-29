import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('E1 — Integración HTTP+DB: PlayerProfile', () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const TS = Date.now();

    const REG = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: `e1-prof-${TS}@test.local`, password: 'password123', name: 'Jugador' })
      .set('Content-Type', 'application/json');
    expect(REG.status).toBe(201);

    token = REG.body.data.accessToken as string;
    userId = REG.body.data.user.id as string;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('GET/PATCH /users/me/profile funciona y persiste en DB', async () => {
    const GET0 = await request(APP).get('/api/v1/users/me/profile').set('Authorization', `Bearer ${token}`);
    expect(GET0.status).toBe(200);

    const PATCH = await request(APP)
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ dominantHand: 'LEFT', sidePreference: 'RIGHT', birthYear: 1990 })
      .set('Content-Type', 'application/json');

    expect(PATCH.status).toBe(200);
    expect(PATCH.body.data.profile.userId).toBe(userId);
    expect(PATCH.body.data.profile.dominantHand).toBe('LEFT');
    expect(PATCH.body.data.profile.sidePreference).toBe('RIGHT');
    expect(PATCH.body.data.profile.birthYear).toBe(1990);

    const DB = await PRISMA.playerProfile.findUnique({ where: { userId } });
    expect(DB).not.toBeNull();
    expect(DB?.dominantHand).toBe('LEFT');
  });

  it('GET /users/:userId/stats retorna 200 con stats básicos (0 si no hay resultados)', async () => {
    const RES = await request(APP).get(`/api/v1/users/${userId}/stats`);
    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
    expect(RES.body.data.userId).toBe(userId);
    expect(RES.body.data.gamesPlayed).toBe(0);
  });
});

