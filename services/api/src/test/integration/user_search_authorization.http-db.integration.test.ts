import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

//? Búsqueda de personas por número de documento: devuelve nombre, email y
//? documento. Es la superficie más sensible del router de perfil y estuvo
//? abierta a peticiones anónimas, así que el guard se verifica explícitamente.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'User search authorization — GET /users/search/by-document (HTTP + DB)',
  () => {
    const DOCUMENT_NUMBER = '19876543';
    let callerToken: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      //? El documento vive en playerProfile, no en User: la búsqueda filtra
      //? por la relación.
      await PRISMA.user.create({
        data: {
          email: `buscado-${Date.now()}@test.local`,
          name: 'Persona Buscada',
          playerProfile: { create: { documentNumber: DOCUMENT_NUMBER } },
        },
      });

      const CALLER = await PRISMA.user.create({
        data: { email: `quien-busca-${Date.now()}@test.local`, name: 'Quien Busca' },
      });
      callerToken = signAccessTokenSV(CALLER.id, CALLER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('rechaza la búsqueda anónima', async () => {
      const RES = await request(APP)
        .get('/api/v1/users/search/by-document')
        .query({ documentNumber: DOCUMENT_NUMBER });

      expect(RES.status).toBe(401);
      expect(RES.body.success).toBe(false);
    });

    it('no filtra datos personales en la respuesta rechazada', async () => {
      const RES = await request(APP)
        .get('/api/v1/users/search/by-document')
        .query({ documentNumber: DOCUMENT_NUMBER });

      expect(JSON.stringify(RES.body)).not.toContain(DOCUMENT_NUMBER);
      expect(JSON.stringify(RES.body)).not.toContain('Persona Buscada');
    });

    it('rechaza un token inválido', async () => {
      const RES = await request(APP)
        .get('/api/v1/users/search/by-document')
        .set('Authorization', 'Bearer no-es-un-token')
        .query({ documentNumber: DOCUMENT_NUMBER });

      expect(RES.status).toBe(401);
    });

    it('devuelve el resultado a un usuario autenticado', async () => {
      const RES = await request(APP)
        .get('/api/v1/users/search/by-document')
        .set('Authorization', `Bearer ${callerToken}`)
        .query({ documentNumber: DOCUMENT_NUMBER });

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);
      //? El payload no cambia: ReservationModal del backoffice ya lo consume.
      expect(RES.body.data.items).toHaveLength(1);
      expect(RES.body.data.items[0]).toMatchObject({
        name: 'Persona Buscada',
        documentNumber: DOCUMENT_NUMBER,
      });
    });
  },
);
