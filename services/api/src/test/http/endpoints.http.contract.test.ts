import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();

describe('Contrato HTTP (validación sin tocar datos)', () => {
  it('GET /api/v1/health responde 200', async () => {
    const RES = await request(APP).get('/api/v1/health');

    expect(RES.status).toBe(200);
    expect(RES.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/register responde 400 si email invalido', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/register')
      .send({
        email: 'no-es-email',
        password: 'password123',
        name: 'Test',
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/auth/login responde 400 si falta password', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/auth/refresh responde 400 si falta refreshToken', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/refresh')
      .send({})
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/me responde 401 sin token', async () => {
    const RES = await request(APP).get('/api/v1/users/me');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/users/me responde 401 con Bearer invalido', async () => {
    const RES = await request(APP)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('TOKEN_INVALIDO');
  });

  it('POST /api/v1/auth/refresh responde 401 si refreshToken no es JWT valido', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'no-es-un-jwt' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('TOKEN_INVALIDO');
  });

  it('PATCH /api/v1/users/me responde 401 sin token', async () => {
    const RES = await request(APP)
      .patch('/api/v1/users/me')
      .send({ name: 'Nuevo' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/tournaments responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'T',
        categoryId: 'bad',
        sportId: '550e8400-e29b-41d4-a716-446655440001',
        formatPresetId: '550e8400-e29b-41d4-a716-446655440002',
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/americanos responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP)
      .post('/api/v1/americanos')
      .send({
        categoryId: 'no-uuid',
        participantUserIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.success).toBe(false);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/matchmaking/:matchId/suggestions responde 400 si matchId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/matchmaking/not-uuid/suggestions');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/ranking/recalculate/:categoryId responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP).post('/api/v1/ranking/recalculate/bad-id');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/matches/:matchId/transactions/create-obligations responde 400 si matchId no es UUID', async () => {
    const RES = await request(APP)
      .post('/api/v1/matches/not-uuid/transactions/create-obligations')
      .send({ amountBasePerPerson: 10 })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/matches/:matchId/transactions/summary responde 400 si matchId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/matches/bad/transactions/summary');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('PATCH /api/v1/transactions/:transactionId/confirm-manual responde 400 si transactionId no es UUID', async () => {
    const RES = await request(APP).patch('/api/v1/transactions/x/confirm-manual');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('PATCH /api/v1/users/:userId/subscription responde 400 si userId no es UUID', async () => {
    const RES = await request(APP)
      .patch('/api/v1/users/no-uuid/subscription')
      .send({ subscriptionType: 'PRO' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/transactions responde 400 si userId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/users/mal/transactions');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/sports/:sportId/tournament-format-presets responde 400 si sportId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/sports/no-uuid/tournament-format-presets');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});
