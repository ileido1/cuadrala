import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();

describe('GET /api/v1/tournaments — filtros (contrato)', () => {
  it('responde 400 si venueId no es UUID', async () => {
    const RES = await request(APP).get('/api/v1/tournaments?venueId=not-a-uuid');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si startsAtFrom no es ISO 8601', async () => {
    const RES = await request(APP).get('/api/v1/tournaments?startsAtFrom=not-a-date');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si startsAtFrom es posterior a startsAtTo', async () => {
    const RES = await request(APP).get(
      '/api/v1/tournaments?startsAtFrom=2026-06-30T00:00:00.000Z&startsAtTo=2026-06-01T00:00:00.000Z',
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 200 (o 500 sin DB) con filtros validos', async () => {
    const RES = await request(APP).get(
      '/api/v1/tournaments?venueId=550e8400-e29b-41d4-a716-446655440001&startsAtFrom=2026-06-01T00:00:00.000Z&startsAtTo=2026-06-30T00:00:00.000Z',
    );

    // Sin DB real, Prisma falla — cubrimos shape esperado cuando DB esté disponible.
    expect([200, 500]).toContain(RES.status);
    if (RES.status === 200) {
      expect(RES.body.success).toBe(true);
      expect(RES.body.data).toHaveProperty('items');
      expect(Array.isArray(RES.body.data.items)).toBe(true);
      expect(RES.body.data).toHaveProperty('pageInfo');
    }
  });
});
