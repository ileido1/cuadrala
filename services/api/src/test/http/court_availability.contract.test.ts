/**
 * Contrato HTTP para el endpoint de disponibilidad de canchas.
 * Change: sdd/court-availability-create-match (PR1 — verificación + contrato)
 *
 * Endpoint: GET /api/v1/venues/:venueId/availability
 * Solo validación (Zod strict) — sin DB. Cada caso espera 400 VALIDACION_FALLIDA.
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

const APP = createApp();
const VALID_VENUE_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_COURT_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('GET /api/v1/venues/:venueId/availability (validación, sin DB)', () => {
  it('responde 400 si venueId no es UUID', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/not-a-uuid/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si falta from (requerido)', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?to=2026-06-01T12:00:00Z`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si falta to (requerido)', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si from >= to (rango inválido)', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T12:00:00Z&to=2026-06-01T10:00:00Z`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si sportId se envía sin categoryId', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z&sportId=${VALID_COURT_ID}`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si categoryId se envía sin sportId', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z&categoryId=${VALID_COURT_ID}`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si se envía un campo de query desconocido (Zod strict)', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z&foo=bar`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si durationMinutes=0 (fuera de 1–1440)', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z&durationMinutes=0`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si courtId no es UUID', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/availability?from=2026-06-01T10:00:00Z&to=2026-06-01T12:00:00Z&courtId=not-a-uuid`,
    );

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});
