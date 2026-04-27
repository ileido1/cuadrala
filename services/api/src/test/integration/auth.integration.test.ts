import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('E1 — Autenticacion y perfil (JWT)', () => {
  const EMAIL = `e1-${Date.now()}@test.local`;
  const PASSWORD = 'password123';
  const NAME = 'Usuario E1';

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST /api/v1/auth/register crea usuario y devuelve tokens', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: EMAIL, password: PASSWORD, name: NAME })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(201);
    expect(RES.body.success).toBe(true);
    expect(RES.body.data.user.email).toBe(EMAIL.toLowerCase());
    expect(typeof RES.body.data.accessToken).toBe('string');
    expect(typeof RES.body.data.refreshToken).toBe('string');
    expect(RES.body.data.expiresIn).toBe(900);
  });

  it('POST /api/v1/auth/register responde 409 si el email ya existe', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/register')
      .send({ email: EMAIL, password: PASSWORD, name: 'Otro' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(409);
    expect(RES.body.code).toBe('EMAIL_YA_REGISTRADO');
  });

  it('POST /api/v1/auth/login devuelve tokens', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(200);
    expect(RES.body.data.user.id).toBeDefined();
    expect(RES.body.data.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/login responde 401 con contraseña incorrecta', async () => {
    const RES = await request(APP)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: 'wrong-password' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(401);
    expect(RES.body.code).toBe('CREDENCIALES_INVALIDAS');
  });

  it('GET /api/v1/users/me y PATCH /api/v1/users/me con Bearer', async () => {
    const LOGIN = await request(APP)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .set('Content-Type', 'application/json');

    const TOKEN = LOGIN.body.data.accessToken as string;

    const ME = await request(APP).get('/api/v1/users/me').set('Authorization', `Bearer ${TOKEN}`);

    expect(ME.status).toBe(200);
    expect(ME.body.data.user.name).toBe(NAME);

    const PATCH = await request(APP)
      .patch('/api/v1/users/me')
      .send({ name: 'Nombre Actualizado' })
      .set('Authorization', `Bearer ${TOKEN}`)
      .set('Content-Type', 'application/json');

    expect(PATCH.status).toBe(200);
    expect(PATCH.body.data.user.name).toBe('Nombre Actualizado');
  });

  it('POST /api/v1/auth/refresh renueva tokens', async () => {
    const LOGIN = await request(APP)
      .post('/api/v1/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .set('Content-Type', 'application/json');

    const REFRESH = LOGIN.body.data.refreshToken as string;

    const RES = await request(APP)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: REFRESH })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(200);
    expect(RES.body.data.accessToken).toBeDefined();
    expect(RES.body.data.refreshToken).toBeDefined();
  });
});
