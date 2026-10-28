/**
 * Pruebas de integración para PrismaTournamentRegistrationRepository.
 * Verifica T13 (issue-47, tournament-invite-link): `createGuestSV` persiste
 * `inviteLinkId` cuando se pasa, y `setInviteLinkIdSV` atribuye una
 * inscripción ya existente a un link. Requires TEST_DATABASE_URL con
 * migraciones aplicadas (campo `TournamentRegistration.inviteLinkId`).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PRISMA } from '../../infrastructure/prisma_client.js';
import { PrismaTournamentRegistrationRepository } from '../../infrastructure/adapters/prisma_tournament_registration_repository.js';
import { PrismaTournamentInviteLinkRepository } from '../../infrastructure/adapters/prisma_tournament_invite_link_repository.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const REGISTRATION_REPO = new PrismaTournamentRegistrationRepository();
const INVITE_LINK_REPO = new PrismaTournamentInviteLinkRepository();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'PrismaTournamentRegistrationRepository — inviteLinkId attribution (Integración DB)',
  () => {
    let categoryId: string;
    let sportId: string;
    let presetAmericanoId: string;
    let organizerUserId: string;

    beforeAll(async () => {
      await resetDatabaseForTestsSV();

      const CATALOG = await ensureTestCatalogSV();
      sportId = CATALOG.sportPadelId;
      presetAmericanoId = CATALOG.presetAmericanoId;

      const CAT = await createTestCategorySV(sportId, `reg-repo-${Date.now()}`, 'Cat Reg Repo');
      categoryId = CAT.id;

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-reg-repo-${Date.now()}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV() {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Reg Repo ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'OPEN',
        },
      });
    }

    describe('createGuestSV', () => {
      it('persists inviteLinkId when passed in the DTO', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        const REGISTRATION = await REGISTRATION_REPO.createGuestSV({
          tournamentId: TOURNAMENT.id,
          guestName: 'Invitado Via Link',
          guestEmail: 'guest-link@example.com',
          registeredByUserId: organizerUserId,
          inviteLinkId: link.id,
        });

        const ROW = await PRISMA.tournamentRegistration.findUniqueOrThrow({
          where: { id: REGISTRATION.id },
        });
        expect(ROW.inviteLinkId).toBe(link.id);
      });

      it('leaves inviteLinkId null when not passed', async () => {
        const TOURNAMENT = await createTournamentSV();

        const REGISTRATION = await REGISTRATION_REPO.createGuestSV({
          tournamentId: TOURNAMENT.id,
          guestName: 'Invitado Sin Link',
          guestEmail: 'guest-no-link@example.com',
          registeredByUserId: organizerUserId,
        });

        const ROW = await PRISMA.tournamentRegistration.findUniqueOrThrow({
          where: { id: REGISTRATION.id },
        });
        expect(ROW.inviteLinkId).toBeNull();
      });
    });

    describe('setInviteLinkIdSV', () => {
      it('attributes an already-existing registration to a link', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });
        const PLAYER = await PRISMA.user.create({
          data: { email: `player-reg-repo-${Date.now()}@test.local`, name: 'Jugador' },
        });
        const { registration: REGISTRATION } = await REGISTRATION_REPO.upsertSV({
          tournamentId: TOURNAMENT.id,
          userId: PLAYER.id,
        });
        expect(
          (await PRISMA.tournamentRegistration.findUniqueOrThrow({ where: { id: REGISTRATION.id } }))
            .inviteLinkId,
        ).toBeNull();

        await REGISTRATION_REPO.setInviteLinkIdSV(REGISTRATION.id, link.id);

        const ROW = await PRISMA.tournamentRegistration.findUniqueOrThrow({
          where: { id: REGISTRATION.id },
        });
        expect(ROW.inviteLinkId).toBe(link.id);
      });
    });
  },
);
