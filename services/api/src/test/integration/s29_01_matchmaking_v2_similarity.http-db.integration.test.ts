import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'Sprint 29 — Matchmaking v2: similaridad + restricciones geo (Integración HTTP + DB)',
  () => {
    let categoryId: string;
    let otherCategoryId: string;
    let sportPadelId: string;
    let matchId: string;

    let participantA: string;
    let participantB: string;
    let candidateNoGeo: string;
    let candidateNearHi: string;
    let candidateNearLo: string;
    let candidateFar: string;
    let candidateOtherCategory: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();
      const CATALOG = await ensureTestCatalogSV();
      sportPadelId = CATALOG.sportPadelId;

      const TS = Date.now();
      const CAT = await PRISMA.category.create({ data: { name: 'Cat S29', slug: `cat-s29-${TS}` } });
      categoryId = CAT.id;
      const CAT2 = await PRISMA.category.create({ data: { name: 'Cat S29 O', slug: `cat-s29-o-${TS}` } });
      otherCategoryId = CAT2.id;

      const USERS = await Promise.all(
        ['pa', 'pb', 'ngeo', 'nearHi', 'nearLo', 'far', 'otherCat'].map(async (_k) => {
          return PRISMA.user.create({
            data: { email: `${_k}-${TS}@test.local`, name: `User ${_k}` },
          });
        }),
      );

      participantA = USERS[0]!.id;
      participantB = USERS[1]!.id;
      candidateNoGeo = USERS[2]!.id;
      candidateNearHi = USERS[3]!.id;
      candidateNearLo = USERS[4]!.id;
      candidateFar = USERS[5]!.id;
      candidateOtherCategory = USERS[6]!.id;

      await PRISMA.userCategory.createMany({
        data: [
          participantA,
          participantB,
          candidateNoGeo,
          candidateNearHi,
          candidateNearLo,
          candidateFar,
        ].map((_userId) => ({ userId: _userId, categoryId })),
      });
      await PRISMA.userCategory.create({
        data: { userId: candidateOtherCategory, categoryId: otherCategoryId },
      });

      // Ratings: target esperado = avg(1500,1700)=1600.
      await PRISMA.userRating.createMany({
        data: [
          { userId: participantA, categoryId, rating: 1500 },
          { userId: participantB, categoryId, rating: 1700 },
          { userId: candidateNoGeo, categoryId, rating: 1601 }, // diff 1
          { userId: candidateNearHi, categoryId, rating: 1610 }, // diff 10 (tie-break higher rating first)
          { userId: candidateNearLo, categoryId, rating: 1590 }, // diff 10
          { userId: candidateFar, categoryId, rating: 1605 }, // diff 5 (pero geo fuera => debe excluirse)
          { userId: candidateOtherCategory, categoryId: otherCategoryId, rating: 1600 },
        ],
      });

      const VENUE = await PRISMA.venue.create({
        data: { name: 'Venue S29', latitude: 10.0, longitude: -66.0 },
      });
      const COURT = await PRISMA.court.create({
        data: { venueId: VENUE.id, name: 'Court S29' },
      });

      const MATCH = await PRISMA.match.create({
        data: {
          categoryId,
          sportId: sportPadelId,
          organizerUserId: participantA,
          type: 'AMERICANO',
          status: 'SCHEDULED',
          courtId: COURT.id,
        },
        select: { id: true },
      });
      matchId = MATCH.id;

      await PRISMA.matchParticipant.createMany({
        data: [
          { matchId, userId: participantA, teamLabel: 'A' },
          { matchId, userId: participantB, teamLabel: 'B' },
        ],
      });

      // Geo: solo algunos usuarios tienen suscripción con geo.
      await PRISMA.notificationSubscription.createMany({
        data: [
          {
            userId: candidateNearHi,
            categoryId,
            nearLat: 10.001,
            nearLng: -66.001,
            radiusKm: 10,
            enabled: true,
          },
          {
            userId: candidateNearLo,
            categoryId,
            nearLat: 10.002,
            nearLng: -66.002,
            radiusKm: 10,
            enabled: true,
          },
          {
            userId: candidateFar,
            categoryId,
            nearLat: -34.6037,
            nearLng: -58.3816,
            radiusKm: 10,
            enabled: true,
          },
        ],
      });
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    it('ordena por cercanía al target, excluye participantes, respeta categoría y aplica radio solo si hay geo', async () => {
      const RES = await request(APP).get(`/api/v1/matchmaking/${matchId}/suggestions?limit=10&radiusKm=10`);

      expect(RES.status).toBe(200);
      expect(RES.body.success).toBe(true);

      const IDS = (RES.body.data.suggestions as { userId: string }[]).map((_s) => _s.userId);
      expect(IDS).not.toContain(participantA);
      expect(IDS).not.toContain(participantB);
      expect(IDS).not.toContain(candidateOtherCategory);

      // candidateFar tiene rating cercano pero geo muy lejano => debe quedar fuera.
      expect(IDS).not.toContain(candidateFar);

      // candidateNoGeo no tiene suscripción => no se filtra por geo.
      expect(IDS[0]).toBe(candidateNoGeo);

      // Empate diff=10 => primero mayor rating.
      const IDX_HI = IDS.indexOf(candidateNearHi);
      const IDX_LO = IDS.indexOf(candidateNearLo);
      expect(IDX_HI).toBeGreaterThanOrEqual(0);
      expect(IDX_LO).toBeGreaterThanOrEqual(0);
      expect(IDX_HI).toBeLessThan(IDX_LO);
    });
  },
);

