import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';

const APP = createApp();

//? Pago Móvil liquida siempre en bolívares. Antes, en una sede que cobra en USD,
//? un Pago Móvil creado sin moneda heredaba USD de la sede.
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Pago Móvil settlement currency (HTTP + DB)', () => {
  let venueId: string;
  let token: string;

  beforeAll(async () => {
    const TS = Date.now();
    const STAFF = await PRISMA.user.create({ data: { email: `pm-bs-staff-${TS}@test.local`, name: 'Staff' } });
    const VENUE = await PRISMA.venue.create({ data: { name: `Sede USD ${TS}`, pricingCurrency: 'USD', displayCurrency: 'USD' } });
    venueId = VENUE.id;
    await PRISMA.venueStaff.create({ data: { venueId, userId: STAFF.id, role: 'STAFF' } });
    token = signAccessTokenSV(STAFF.id, STAFF.email);
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  const create = (_body: Record<string, unknown>) =>
    request(APP).post(`/api/v1/venues/${venueId}/payment-methods`).set('Authorization', `Bearer ${token}`).send(_body);
  const update = (_id: string, _body: Record<string, unknown>) =>
    request(APP).put(`/api/v1/venues/${venueId}/payment-methods/${_id}`).set('Authorization', `Bearer ${token}`).send(_body);

  it('should settle a new Pago Móvil in BS even when the venue charges in USD', async () => {
    const RES = await create({ type: 'PAGO_MOVIL', name: 'Pago Móvil' });

    expect(RES.status).toBe(201);
    expect(RES.body.data.settlementCurrency).toBe('BS');
  });

  it('should reject a Pago Móvil in another currency without creating it', async () => {
    const BEFORE = await PRISMA.venuePaymentMethod.count({ where: { venueId } });

    const RES = await create({ type: 'PAGO_MOVIL', name: 'Pago Móvil USD', settlementCurrency: 'USD' });

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    expect(await PRISMA.venuePaymentMethod.count({ where: { venueId } })).toBe(BEFORE);
  });

  it('should keep other methods on the venue currency when none is given', async () => {
    const RES = await create({ type: 'CASH', name: 'Efectivo' });

    expect(RES.status).toBe(201);
    expect(RES.body.data.settlementCurrency).toBe('USD');
  });

  it('should move a method to BS when it is changed to Pago Móvil', async () => {
    const CASH = await create({ type: 'CASH', name: 'Efectivo 2' });

    const RES = await update(CASH.body.data.id as string, { type: 'PAGO_MOVIL' });

    expect(RES.status).toBe(200);
    expect(RES.body.data.type).toBe('PAGO_MOVIL');
    expect(RES.body.data.settlementCurrency).toBe('BS');
  });

  it('should reject changing a Pago Móvil to another currency and leave it unchanged', async () => {
    const PM = await create({ type: 'PAGO_MOVIL', name: 'Pago Móvil 2' });

    const RES = await update(PM.body.data.id as string, { settlementCurrency: 'USD' });

    expect(RES.status).toBe(400);
    expect(RES.body.code).toBe('VALIDACION_FALLIDA');
    const ROW = await PRISMA.venuePaymentMethod.findUniqueOrThrow({ where: { id: PM.body.data.id as string } });
    expect(ROW.settlementCurrency).toBe('BS');
  });
});
