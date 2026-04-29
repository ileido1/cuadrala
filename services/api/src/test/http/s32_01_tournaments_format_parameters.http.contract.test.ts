import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();

describe(
  'Sprint 32 — E0-02: Contrato HTTP POST /api/v1/tournaments (validación formatParameters sin DB)',
  () => {
  it("ROUND_ROBIN: doubleRound='yes' responde 400 VALIDACION_FALLIDA", async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo Contract',
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        sportId: '550e8400-e29b-41d4-a716-446655440002',
        formatPresetCode: 'ROUND_ROBIN',
        formatParameters: { doubleRound: 'yes' },
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('AMERICANO: rounds=0 responde 400 VALIDACION_FALLIDA', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo Contract',
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        sportId: '550e8400-e29b-41d4-a716-446655440002',
        formatPresetCode: 'AMERICANO',
        formatParameters: { rounds: 0 },
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('ROUND_ROBIN: key extra en formatParameters responde 400 VALIDACION_FALLIDA', async () => {
    const RES = await request(APP)
      .post('/api/v1/tournaments')
      .send({
        name: 'Torneo Contract',
        categoryId: '550e8400-e29b-41d4-a716-446655440001',
        sportId: '550e8400-e29b-41d4-a716-446655440002',
        formatPresetCode: 'ROUND_ROBIN',
        formatParameters: { doubleRound: true, extra: 1 },
      })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
  },
);

