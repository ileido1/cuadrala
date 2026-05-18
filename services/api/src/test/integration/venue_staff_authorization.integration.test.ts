import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Venue staff authorization — dashboard-stats (HTTP + DB)',
  () => {
    let venueId: string;
    let staffToken: string;
    let outsiderToken: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const TS = Date.now();
      const STAFF = await PRISMA.user.create({
        data: { email: `staff-${TS}@test.local`, name: 'Staff' },
      });
      const OUTSIDER = await PRISMA.user.create({
        data: { email: `outsider-${TS}@test.local`, name: 'Outsider' },
      });

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Sede Auth Test' },
      });
      venueId = VENUE.id;

      await PRISMA.venueStaff.create({
        data: { venueId, userId: STAFF.id, role: 'STAFF' },
      });

      staffToken = signAccessTokenSV(STAFF.id, STAFF.email);
      outsiderToken = signAccessTokenSV(OUTSIDER.id, OUTSIDER.email);
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('should return 200 when staff requests dashboard-stats', async () => {
      const RES = await request(APP)
        .get(`/api/v1/venues/${venueId}/dashboard-stats`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);
    });

    it('should return 403 when non-staff requests dashboard-stats', async () => {
      const RES = await request(APP)
        .get(`/api/v1/venues/${venueId}/dashboard-stats`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(RES.status).toBe(403);
      expect(RES.body.success).toBe(false);
    });
  },
);
