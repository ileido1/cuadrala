import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

const APP = createApp();
const VALID_ACCESS_TOKEN = signAccessTokenSV(
  '550e8400-e29b-41d4-a716-446655440001',
  'mine@test.local',
);

describe('GET /api/v1/matches/mine — contract tests (sin DB)', () => {
  it('responds 401 without auth token', async () => {
    const RES = await request(APP).get('/api/v1/matches/mine');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responds 400 with invalid limit', async () => {
    const RES = await request(APP)
      .get('/api/v1/matches/mine?limit=abc')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responds 400 with invalid status value', async () => {
    const RES = await request(APP)
      .get('/api/v1/matches/mine?status=UNKNOWN_STATUS')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responds 400 with invalid role value', async () => {
    const RES = await request(APP)
      .get('/api/v1/matches/mine?role=SUPERADMIN')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responds 400 with page=0', async () => {
    const RES = await request(APP)
      .get('/api/v1/matches/mine?page=0')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});
