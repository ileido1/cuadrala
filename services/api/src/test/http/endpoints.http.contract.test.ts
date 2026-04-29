import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { ENV_CONST } from '../../config/env.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

const APP = createApp();
const VALID_ACCESS_TOKEN = signAccessTokenSV(
  '550e8400-e29b-41d4-a716-446655440001',
  'contract@test.local',
);

describe('Contrato HTTP (validación sin tocar datos)', () => {
  it('GET /api/v1/health responde 200', async () => {
    const RES = await request(APP).get('/api/v1/health');

    expect(RES.status).toBe(200);
    expect(RES.body.status).toBe('ok');
  });

  it('GET /api/v1/ready responde 200 o 503', async () => {
    const RES = await request(APP).get('/api/v1/ready');

    expect([200, 503]).toContain(RES.status);
    expect(['ready', 'not_ready']).toContain(RES.body.status);
  });

  it('GET /openapi.json responde 200 y contiene openapi', async () => {
    const RES = await request(APP).get('/openapi.json');

    expect(RES.status).toBe(200);
    expect(RES.body.openapi).toBe('3.0.3');
    expect(RES.body.info?.title).toBeDefined();
  });

  it('GET /api/v1/matches/open responde 400 si sportId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/matches/open?sportId=bad');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/matches/:matchId/join responde 401 sin token', async () => {
    const RES = await request(APP).post(
      '/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/join',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/matches/:matchId/leave responde 401 sin token', async () => {
    const RES = await request(APP).post(
      '/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/leave',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/matches/:matchId/start responde 401 sin token', async () => {
    const RES = await request(APP).post(
      '/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/start',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/matches/:matchId/finish responde 401 sin token', async () => {
    const RES = await request(APP).post(
      '/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/finish',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PUT /api/v1/matches/:matchId/result-draft responde 401 sin token', async () => {
    const RES = await request(APP)
      .put('/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/result-draft')
      .send({
        scores: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', points: 1 },
          { userId: '550e8400-e29b-41d4-a716-446655440002', points: 1 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', points: 1 },
          { userId: '550e8400-e29b-41d4-a716-446655440004', points: 1 },
        ],
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/matches/:matchId/result-draft/confirm responde 401 sin token', async () => {
    const RES = await request(APP)
      .post('/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/result-draft/confirm')
      .send({ status: 'CONFIRMED' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/matches/:matchId responde 400 si matchId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/matches/no-uuid');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('PATCH /api/v1/matches/:matchId responde 401 sin token', async () => {
    const RES = await request(APP)
      .patch('/api/v1/matches/550e8400-e29b-41d4-a716-446655440001')
      .send({ maxParticipants: 4 })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PATCH /api/v1/matches/:matchId/cancel responde 401 sin token', async () => {
    const RES = await request(APP).patch(
      '/api/v1/matches/550e8400-e29b-41d4-a716-446655440001/cancel',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/matches responde 401 sin token', async () => {
    const RES = await request(APP)
      .post('/api/v1/matches')
      .send({
        sportId: '550e8400-e29b-41d4-a716-446655440001',
        categoryId: '550e8400-e29b-41d4-a716-446655440002',
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/tournaments/:tournamentId/americano-schedule:generate responde 400 si tournamentId no es UUID', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments/no-uuid/americano-schedule:generate')
      .send({ participantUserIds: ['550e8400-e29b-41d4-a716-446655440001'] })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/tournaments/:tournamentId/scoreboard responde 400 si tournamentId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/tournaments/no-uuid/scoreboard');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /docs responde 200 (Swagger UI)', async () => {
    const RES = await request(APP).get('/docs');

    expect(RES.status).toBe(200);
    expect(RES.text).toContain('swagger-ui');
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

  it('GET /api/v1/users/me/profile responde 401 sin token', async () => {
    const RES = await request(APP).get('/api/v1/users/me/profile');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PATCH /api/v1/users/me/profile responde 401 sin token', async () => {
    const RES = await request(APP)
      .patch('/api/v1/users/me/profile')
      .send({ dominantHand: 'RIGHT' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/users/:userId/stats responde 400 si userId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/users/no-uuid/stats');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings responde 400 si userId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/users/no-uuid/ratings');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP).get(
      '/api/v1/users/550e8400-e29b-41d4-a716-446655440001/ratings?categoryId=bad',
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings/history responde 400 si userId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/users/no-uuid/ratings/history');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings/history responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP).get(
      '/api/v1/users/550e8400-e29b-41d4-a716-446655440001/ratings/history?categoryId=bad',
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings/history responde 400 si limit > 100', async () => {
    const RES = await request(APP).get(
      '/api/v1/users/550e8400-e29b-41d4-a716-446655440001/ratings/history?limit=101',
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/:userId/ratings/history responde 400 si page < 1', async () => {
    const RES = await request(APP).get(
      '/api/v1/users/550e8400-e29b-41d4-a716-446655440001/ratings/history?page=0',
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
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

  it('GET /api/v1/ratings/leaderboard responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/ratings/leaderboard?categoryId=bad');

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

  it('GET /api/v1/users/me/notification-subscriptions responde 401 sin token', async () => {
    const RES = await request(APP).get('/api/v1/users/me/notification-subscriptions');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/users/me/notification-subscriptions responde 401 sin token', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/notification-subscriptions')
      .send({ enabled: true })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/users/me/notifications responde 401 sin token', async () => {
    const RES = await request(APP).get('/api/v1/users/me/notifications');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PATCH /api/v1/users/me/notifications/:deliveryId/read responde 401 sin token', async () => {
    const RES = await request(APP).patch(
      '/api/v1/users/me/notifications/550e8400-e29b-41d4-a716-446655440001/read',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PATCH /api/v1/users/me/notifications/read-all responde 401 sin token', async () => {
    const RES = await request(APP).patch('/api/v1/users/me/notifications/read-all');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/transactions/:transactionId/receipt responde 401 sin token', async () => {
    const RES = await request(APP).post(
      '/api/v1/transactions/550e8400-e29b-41d4-a716-446655440001/receipt',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/transactions/:transactionId/receipt/:receiptId responde 401 sin token', async () => {
    const RES = await request(APP).get(
      '/api/v1/transactions/550e8400-e29b-41d4-a716-446655440001/receipt/550e8400-e29b-41d4-a716-446655440002',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('DELETE /api/v1/users/me/notification-subscriptions responde 401 sin token', async () => {
    const RES = await request(APP).delete(
      '/api/v1/users/me/notification-subscriptions/550e8400-e29b-41d4-a716-446655440001',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/users/me/notification-subscriptions responde 400 si categoryId no es UUID', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/notification-subscriptions')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        enabled: true,
        categoryId: 'bad',
        nearLat: 10,
        nearLng: -66,
        radiusKm: 10,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/users/me/notification-subscriptions responde 400 si geo es incoherente', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/notification-subscriptions')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        enabled: true,
        categoryId: '550e8400-e29b-41d4-a716-446655440002',
        // Incoherente: falta nearLng
        nearLat: 10,
        radiusKm: 10,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/users/me/notification-subscriptions responde 400 si lat/lng fuera de rango', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/notification-subscriptions')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        enabled: true,
        categoryId: '550e8400-e29b-41d4-a716-446655440002',
        nearLat: 200,
        nearLng: -190,
        radiusKm: 10,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/users/me/notification-subscriptions responde 400 si radiusKm <= 0', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/notification-subscriptions')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        enabled: true,
        categoryId: '550e8400-e29b-41d4-a716-446655440002',
        nearLat: 10,
        nearLng: -66,
        radiusKm: 0,
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('GET /api/v1/users/me/device-push-tokens responde 401 sin token', async () => {
    const RES = await request(APP).get('/api/v1/users/me/device-push-tokens');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/users/me/device-push-tokens responde 401 sin token', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/device-push-tokens')
      .send({ token: 'fcm-token-contract-aaaaaaaaaaaaaaaa', enabled: true })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('DELETE /api/v1/users/me/device-push-tokens responde 401 sin token', async () => {
    const RES = await request(APP).delete(
      '/api/v1/users/me/device-push-tokens/550e8400-e29b-41d4-a716-446655440001',
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/users/me/device-push-tokens responde 400 si token es corto', async () => {
    const RES = await request(APP)
      .post('/api/v1/users/me/device-push-tokens')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ token: 'short', enabled: true })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('POST /api/v1/notifications/dispatch responde 401 si falta x-dispatch-secret', async () => {
    const RES = await request(APP)
      .post('/api/v1/notifications/dispatch')
      .send({})
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('POST /api/v1/notifications/dispatch responde 401 si x-dispatch-secret incorrecto', async () => {
    const RES = await request(APP)
      .post('/api/v1/notifications/dispatch')
      .set('x-dispatch-secret', 'bad-secret')
      .send({})
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/geo/places/search responde 401 si falta x-geo-secret', async () => {
    const RES = await request(APP).get('/api/v1/geo/places/search?q=club');
    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/geo/places/search responde 501 con provider noop', async () => {
    process.env.MAPS_PROVIDER = 'noop';
    const RES = await request(APP)
      .get('/api/v1/geo/places/search?q=club&limit=3')
      .set('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET);
    expect(RES.status).toBe(501);
    expect(RES.body.code).toBe('NO_IMPLEMENTADO');
  });

  it('GET /api/v1/geo/places/:placeId responde 501 con provider noop', async () => {
    process.env.MAPS_PROVIDER = 'noop';
    const RES = await request(APP)
      .get('/api/v1/geo/places/some-place-id')
      .set('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET);
    expect(RES.status).toBe(501);
    expect(RES.body.code).toBe('NO_IMPLEMENTADO');
  });

  it('POST /api/v1/vacant-hours/publish responde 401 si falta x-admin-secret', async () => {
    const RES = await request(APP)
      .post('/api/v1/vacant-hours/publish')
      .send({})
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('GET /api/v1/vacant-hours responde 401 si falta x-admin-secret', async () => {
    const RES = await request(APP).get('/api/v1/vacant-hours');
    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('PATCH /api/v1/vacant-hours/:id/cancel responde 401 si falta x-admin-secret', async () => {
    const RES = await request(APP).patch('/api/v1/vacant-hours/550e8400-e29b-41d4-a716-446655440000/cancel');
    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });
});
