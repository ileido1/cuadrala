/**
 * Change: sdd/venue-geo-search (PR1 — Phase 1)
 * Contrato HTTP para GET /api/v1/venues — solo validación (sin DB).
 * Cada caso inválido espera 400 VALIDACION_FALLIDA antes de tocar datos.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();

describe('GET /api/v1/venues (validación sportType, sin DB)', () => {
  it('responde 400 si sportType no es PADEL|TENNIS', async () => {
    const RES = await request(APP).get('/api/v1/venues?sportType=FOOBAR');
    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si sportType está en minúsculas', async () => {
    const RES = await request(APP).get('/api/v1/venues?sportType=padel');
    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});
