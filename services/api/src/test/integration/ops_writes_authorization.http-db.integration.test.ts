import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { ENV_CONST } from '../../config/env.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

//? Dos escrituras que no tienen dueño de negocio: cambiar el plan de cualquier
//? usuario y publicar versiones del catálogo de presets. Ambas quedan detrás del
//? mismo secreto compartido que ya usan admin.router y ranking.router.
describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Ops writes authorization — subscription + format presets (HTTP + DB)',
  () => {
    let userId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const USER = await PRISMA.user.create({
        data: { email: `ops-${Date.now()}@test.local`, name: 'Ops Target' },
      });
      userId = USER.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    describe('PATCH /users/:userId/subscription', () => {
      it('should return 401 when no admin secret is provided', async () => {
        const RES = await request(APP)
          .patch(`/api/v1/users/${userId}/subscription`)
          .send({ subscriptionType: 'PRO' });

        expect(RES.status).toBe(401);
        expect(RES.body.success).toBe(false);
      });

      it('should return 401 when the admin secret is wrong', async () => {
        const RES = await request(APP)
          .patch(`/api/v1/users/${userId}/subscription`)
          .set('x-admin-secret', 'no-es-el-secreto-pero-tiene-largo-suficiente!!')
          .send({ subscriptionType: 'PRO' });

        expect(RES.status).toBe(401);
      });

      it('should update the subscription when the admin secret is valid', async () => {
        const RES = await request(APP)
          .patch(`/api/v1/users/${userId}/subscription`)
          .set('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET)
          .send({ subscriptionType: 'PRO' });

        expect(RES.status).toBe(200);
        expect(RES.body.success).toBe(true);
      });
    });

    describe('POST /sports/:sportId/tournament-format-presets/:code/versions', () => {
      //? Sede/deporte inexistente a propósito: sin el secreto la request tiene que
      //? morir en 401 ANTES de mirar la base. Ese es justamente el punto.
      const BOGUS_SPORT_ID = '00000000-0000-0000-0000-000000000000';

      it('should return 401 when no admin secret is provided', async () => {
        const RES = await request(APP)
          .post(`/api/v1/sports/${BOGUS_SPORT_ID}/tournament-format-presets/ROUND_ROBIN/versions`)
          .send({});

        expect(RES.status).toBe(401);
        expect(RES.body.success).toBe(false);
      });

      it('should get past the guard when the admin secret is valid', async () => {
        const RES = await request(APP)
          .post(`/api/v1/sports/${BOGUS_SPORT_ID}/tournament-format-presets/ROUND_ROBIN/versions`)
          .set('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET)
          .send({});

        //? No afirmamos el código exacto: el body vacío puede caer en 400 o 404
        //? según valide primero. Lo que importa es que ya no sea 401.
        expect(RES.status).not.toBe(401);
      });
    });
  },
);
