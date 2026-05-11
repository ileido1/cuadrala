import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

const APP = createApp();

describe('PUT /api/v1/users/me/onboarding-status', () => {
  const VALID_ACCESS_TOKEN = signAccessTokenSV(
    '550e8400-e29b-41d4-a716-446655440001',
    'contract@test.local',
  );

  it('returns 200 when called by authenticated user', async () => {
    const RES = await request(APP)
      .put('/api/v1/users/me/onboarding-status')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({});

    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
  });

  it('returns 401 when called without token', async () => {
    const RES = await request(APP)
      .put('/api/v1/users/me/onboarding-status')
      .send({});

    expect(RES.status).toBe(401);
  });
});
