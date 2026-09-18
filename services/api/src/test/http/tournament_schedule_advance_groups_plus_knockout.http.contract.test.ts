import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();

describe('POST /api/v1/tournaments/:id/schedule:advance-groups-plus-knockout — contract tests', () => {
  it('responds 401 without auth token', async () => {
    const RES = await request(APP)
      .post(
        '/api/v1/tournaments/550e8400-e29b-41d4-a716-446655440000/schedule:advance-groups-plus-knockout',
      )
      .send({})
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });
});
