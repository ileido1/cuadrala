/**
 * Contrato HTTP — ajustes compensatorios ledger (REQ-MCP-057).
 */

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

const APP = createApp();
const VALID_ACCESS_TOKEN = signAccessTokenSV(
  '550e8400-e29b-41d4-a716-446655440001',
  'ledger-contract@test.local',
);
const VALID_VENUE_ID = '550e8400-e29b-41d4-a716-446655440010';
const VALID_RESERVATION_ID = '550e8400-e29b-41d4-a716-446655440011';

describe(
  'POST /api/v1/venues/:venueId/reservations/:reservationId/ledger/compensatory-adjustments',
  () => {
    it('should respond 401 without token', async () => {
      const RES = await request(APP).post(
        `/api/v1/venues/${VALID_VENUE_ID}/reservations/${VALID_RESERVATION_ID}/ledger/compensatory-adjustments`,
      ).send({
        amount: { amountMinor: '100', currencyCode: 'USD' },
        amountBsMinor: '5000',
        reason: 'Ajuste test',
      });

      expect(RES.status).toBe(401);
      expect(RES.body.code).toBe('NO_AUTORIZADO');
    });

    it('should respond 400 when body is invalid', async () => {
      const RES = await request(APP)
        .post(
          `/api/v1/venues/${VALID_VENUE_ID}/reservations/${VALID_RESERVATION_ID}/ledger/compensatory-adjustments`,
        )
        .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
        .send({ amount: { amountMinor: '100', currencyCode: 'USD' } });

      expect(RES.status).toBe(400);
      expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    });

    it('should respond 403 or 503 when user is not venue staff or ledger off', async () => {
      const RES = await request(APP)
        .post(
          `/api/v1/venues/${VALID_VENUE_ID}/reservations/${VALID_RESERVATION_ID}/ledger/compensatory-adjustments`,
        )
        .set('Authorization', `Bearer ${VALID_ACCESS_TOKEN}`)
        .send({
          amount: { amountMinor: '100', currencyCode: 'USD' },
          amountBsMinor: '5000',
          reason: 'Corrección manual',
        });

      expect([403, 503, 404]).toContain(RES.status);
    });
  },
);
