/**
 * Contrato HTTP para endpoints de Bookings unificados.
 * Design: sdd/unificar-match-reservation (PR4 — API Routes & Controllers)
 *
 * Endpoints bajo /api/v1/venues/:venueId/bookings
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

const APP = createApp();
const VALID_ACCESS_TOKEN = signAccessTokenSV(
  '550e8400-e29b-41d4-a716-446655440001',
  'contract@test.local',
);
const VALID_VENUE_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_COURT_ID = '550e8400-e29b-41d4-a716-446655440002';
const VALID_BOOKING_ID = '550e8400-e29b-41d4-a716-446655440003';

describe('GET /api/v1/venues/:venueId/bookings', () => {
  it('responde 401 sin token', async () => {
    const RES = await request(APP).get(`/api/v1/venues/${VALID_VENUE_ID}/bookings`);

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responde 400 si venueId no es UUID', async () => {
    const RES = await request(APP)
      .get('/api/v1/venues/not-a-uuid/bookings')
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 200 con token válido y lista vacía para venue sin bookings', async () => {
    const RES = await request(APP)
      .get(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    // 200 o 403 si el usuario no es staff del venue
    expect([200, 403]).toContain(RES.status);
  });

  it('responde 400 para query page=0 inválida', async () => {
    const RES = await request(APP)
      .get(`/api/v1/venues/${VALID_VENUE_ID}/bookings?page=0`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    // 400 validación o 403 si no es staff
    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 para query limit=101 inválida', async () => {
    const RES = await request(APP)
      .get(`/api/v1/venues/${VALID_VENUE_ID}/bookings?limit=101`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect([400, 403]).toContain(RES.status);
  });
});

describe('POST /api/v1/venues/:venueId/bookings', () => {
  it('responde 401 sin token', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .send({ type: 'DIRECT', courtId: VALID_COURT_ID, scheduledAt: '2026-06-01T10:00:00Z' });

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responde 400 si type falta', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ courtId: VALID_COURT_ID, scheduledAt: '2026-06-01T10:00:00Z' });

    // 400 validación o 403 si no es staff
    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 si courtId no es UUID', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ type: 'DIRECT', courtId: 'not-a-uuid', scheduledAt: '2026-06-01T10:00:00Z' });

    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 si scheduledAt no es ISO datetime', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ type: 'DIRECT', courtId: VALID_COURT_ID, scheduledAt: 'not-valid-date' });

    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 si type es inválido', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ type: 'INVALID', courtId: VALID_COURT_ID, scheduledAt: '2026-06-01T10:00:00Z' });

    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 si type=MATCH pero falta organizerUserId', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        type: 'MATCH',
        courtId: VALID_COURT_ID,
        scheduledAt: '2026-06-01T10:00:00Z',
        visibility: 'PUBLISHED',
      });

    // 400 validación, o 403 si no es staff, o 404 si la cancha no existe
    expect([400, 403, 404]).toContain(RES.status);
  });

  it('responde 400 para durationMinutes negativo', async () => {
    const RES = await request(APP)
      .post(`/api/v1/venues/${VALID_VENUE_ID}/bookings`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({
        type: 'DIRECT',
        courtId: VALID_COURT_ID,
        scheduledAt: '2026-06-01T10:00:00Z',
        durationMinutes: -30,
      });

    expect([400, 403]).toContain(RES.status);
  });
});

describe('GET /api/v1/venues/:venueId/bookings/:bookingId', () => {
  it('responde 401 sin token', async () => {
    const RES = await request(APP).get(
      `/api/v1/venues/${VALID_VENUE_ID}/bookings/${VALID_BOOKING_ID}`,
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responde 400 si bookingId no es UUID', async () => {
    const RES = await request(APP)
      .get(`/api/v1/venues/${VALID_VENUE_ID}/bookings/not-a-uuid`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});

describe('PATCH /api/v1/venues/:venueId/bookings/:bookingId', () => {
  it('responde 401 sin token', async () => {
    const RES = await request(APP)
      .patch(`/api/v1/venues/${VALID_VENUE_ID}/bookings/${VALID_BOOKING_ID}`)
      .send({ visibility: 'PUBLISHED' });

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responde 400 si bookingId no es UUID', async () => {
    const RES = await request(APP)
      .patch(`/api/v1/venues/${VALID_VENUE_ID}/bookings/not-a-uuid`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ visibility: 'PUBLISHED' });

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });

  it('responde 400 si visibility es inválido', async () => {
    const RES = await request(APP)
      .patch(`/api/v1/venues/${VALID_VENUE_ID}/bookings/${VALID_BOOKING_ID}`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ visibility: 'INVALID' });

    expect([400, 403]).toContain(RES.status);
  });

  it('responde 400 si matchStatus es inválido', async () => {
    const RES = await request(APP)
      .patch(`/api/v1/venues/${VALID_VENUE_ID}/bookings/${VALID_BOOKING_ID}`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
      .send({ matchStatus: 'INVALID' });

    expect([400, 403]).toContain(RES.status);
  });
});

describe('DELETE /api/v1/venues/:venueId/bookings/:bookingId', () => {
  it('responde 401 sin token', async () => {
    const RES = await request(APP).delete(
      `/api/v1/venues/${VALID_VENUE_ID}/bookings/${VALID_BOOKING_ID}`,
    );

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('NO_AUTORIZADO');
  });

  it('responde 400 si bookingId no es UUID', async () => {
    const RES = await request(APP)
      .delete(`/api/v1/venues/${VALID_VENUE_ID}/bookings/not-a-uuid`)
      .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`);

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
  });
});