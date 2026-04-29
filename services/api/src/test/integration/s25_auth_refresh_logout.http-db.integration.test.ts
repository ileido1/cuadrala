import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 25 — Integración HTTP + DB: refresh rotation + logout',
  () => {
    const EMAIL = `s25-${Date.now()}@test.local`;
    const PASSWORD = 'password123';
    const NAME = 'Usuario S25';

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('register -> refresh -> refresh token viejo => 401 (token reuse)', async () => {
      const REG = await request(APP)
        .post('/api/v1/auth/register')
        .send({ email: EMAIL, password: PASSWORD, name: NAME })
        .set('Content-Type', 'application/json');

      expect(REG.status).toBe(201);
      expect(REG.body.success).toBe(true);
      expect(typeof REG.body.data.refreshToken).toBe('string');

      const OLD_REFRESH: string = REG.body.data.refreshToken as string;

      const REFRESH_1 = await request(APP)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: OLD_REFRESH })
        .set('Content-Type', 'application/json');

      expect(REFRESH_1.status).toBe(200);
      expect(REFRESH_1.body.success).toBe(true);
      expect(typeof REFRESH_1.body.data.refreshToken).toBe('string');

      const REFRESH_OLD_AGAIN = await request(APP)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: OLD_REFRESH })
        .set('Content-Type', 'application/json');

      expect(REFRESH_OLD_AGAIN.status).toBe(401);
      expect(REFRESH_OLD_AGAIN.body).toMatchObject({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: expect.any(String),
      });
    });

    it('logout -> refresh => 401 (refresh revocado)', async () => {
      const LOGIN = await request(APP)
        .post('/api/v1/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .set('Content-Type', 'application/json');

      expect(LOGIN.status).toBe(200);
      expect(LOGIN.body.success).toBe(true);
      expect(typeof LOGIN.body.data.refreshToken).toBe('string');

      const REFRESH: string = LOGIN.body.data.refreshToken as string;

      const LOGOUT = await request(APP)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: REFRESH })
        .set('Content-Type', 'application/json');

      expect(LOGOUT.status).toBe(200);
      expect(LOGOUT.body).toMatchObject({
        success: true,
        message: expect.any(String),
      });

      const REFRESH_AFTER_LOGOUT = await request(APP)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: REFRESH })
        .set('Content-Type', 'application/json');

      expect(REFRESH_AFTER_LOGOUT.status).toBe(401);
      expect(REFRESH_AFTER_LOGOUT.body).toMatchObject({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: expect.any(String),
      });
    });

    it('POST /api/v1/auth/refresh: refreshToken malformado (no JWT) => 401 TOKEN_INVALIDO', async () => {
      const RES = await request(APP)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'no-es-un-jwt' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(401);
      expect(RES.body).toMatchObject({
        success: false,
        code: 'TOKEN_INVALIDO',
        message: expect.any(String),
      });
    });

    it('POST /api/v1/auth/refresh: ausencia de refreshToken => 400 VALIDACION_FALLIDA', async () => {
      const RES = await request(APP)
        .post('/api/v1/auth/refresh')
        .send({})
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(RES.body).toMatchObject({
        success: false,
        code: 'VALIDACION_FALLIDA',
        message: expect.any(String),
      });
    });
  },
);
