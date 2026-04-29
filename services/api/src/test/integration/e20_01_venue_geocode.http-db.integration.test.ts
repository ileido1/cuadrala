import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { ENV_CONST } from '../../config/env.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('E20 — Integración HTTP+DB: Venue geocoding', () => {
  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    process.env.MAPS_PROVIDER = 'stub';
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  it('POST /api/v1/venues/:venueId/geocode persiste placeId y dirección normalizada', async () => {
    const CREATED = await request(APP)
      .post('/api/v1/venues')
      .send({ name: 'Sede Test' })
      .set('Content-Type', 'application/json');
    expect(CREATED.status).toBe(201);
    const VENUE_ID = CREATED.body.data.id as string;

    const RES = await request(APP)
      .post(`/api/v1/venues/${VENUE_ID}/geocode`)
      .set('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET)
      .send({ placeId: 'stub-place-1' })
      .set('Content-Type', 'application/json');

    expect(RES.status).toBe(200);
    expect(RES.body.success).toBe(true);
    expect(RES.body.data.id).toBe(VENUE_ID);
    expect(RES.body.data.placeId).toBe('stub-place-1');
    expect(RES.body.data.formattedAddress).toBeDefined();
    expect(RES.body.data.geocodedAt).toBeDefined();

    const DB = await PRISMA.venue.findUnique({ where: { id: VENUE_ID } });
    expect(DB?.placeId).toBe('stub-place-1');
    expect(DB?.formattedAddress).toBeTruthy();
    expect(DB?.addressCountry).toBeTruthy();
    expect(DB?.geocodedAt).not.toBeNull();
  });
});

