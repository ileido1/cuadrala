/**
 * Pruebas de integración para PrismaTournamentInviteLinkRepository.
 * Verifica T12: generación/hash de token (NFR-TIL-001), búsqueda por hash
 * (REQ-TIL-002), listado con registrants (REQ-TIL-006) e idempotencia de
 * incrementUsesCountSV/revokeSV. Requires TEST_DATABASE_URL con migraciones
 * aplicadas (modelo `TournamentInviteLink`, campo `TournamentRegistration.
 * inviteLinkId` — issue-47).
 */
import { createHash } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PRISMA } from '../../infrastructure/prisma_client.js';
import { PrismaTournamentInviteLinkRepository } from '../../infrastructure/adapters/prisma_tournament_invite_link_repository.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const INVITE_LINK_REPO = new PrismaTournamentInviteLinkRepository();

describe.skipIf(!HAS_INTEGRATION_DATABASE)(
  'PrismaTournamentInviteLinkRepository (Integración DB)',
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

      const CAT = await createTestCategorySV(sportId, `invite-link-${Date.now()}`, 'Cat Invite Link');
      categoryId = CAT.id;

      const ORGANIZER = await PRISMA.user.create({
        data: { email: `organizer-invite-link-${Date.now()}@test.local`, name: 'Organizer' },
      });
      organizerUserId = ORGANIZER.id;
    });

    afterAll(async () => {
      await PRISMA.$disconnect();
    });

    async function createTournamentSV() {
      return PRISMA.tournament.create({
        data: {
          name: `Torneo Invite Link ${Date.now()}`,
          categoryId,
          sportId,
          formatPresetId: presetAmericanoId,
          organizerUserId,
          status: 'OPEN',
        },
      });
    }

    describe('createSV', () => {
      it('returns the raw token once and persists only its sha256 hash', async () => {
        const TOURNAMENT = await createTournamentSV();
        const EXPIRES_AT = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { link, token } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: EXPIRES_AT,
          maxUses: null,
        });

        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThanOrEqual(40);
        expect(link.tournamentId).toBe(TOURNAMENT.id);
        expect(link.createdByUserId).toBe(organizerUserId);
        expect(link.maxUses).toBeNull();
        expect(link.usesCount).toBe(0);
        expect(link.revokedAt).toBeNull();

        //? Nunca se persiste el token crudo: la única columna de token en la
        //? fila es `tokenHash`, y debe ser exactamente sha256(token) hex.
        const ROW = await PRISMA.tournamentInviteLink.findUniqueOrThrow({ where: { id: link.id } });
        expect(ROW.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
        expect(ROW.tokenHash).not.toBe(token);
        expect(JSON.stringify(ROW)).not.toContain(token);
      });
    });

    describe('findByTokenHashSV', () => {
      it('finds the link by hashing the raw token internally, never comparing it raw', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link, token } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        const FOUND = await INVITE_LINK_REPO.findByTokenHashSV(token);

        expect(FOUND?.id).toBe(link.id);
      });

      it('returns null for a token that does not match any hash', async () => {
        const FOUND = await INVITE_LINK_REPO.findByTokenHashSV('a-token-that-was-never-issued-by-anyone');

        expect(FOUND).toBeNull();
      });
    });

    describe('findByIdAndTournamentIdSV', () => {
      it('returns null when the link belongs to a different tournament', async () => {
        const TOURNAMENT = await createTournamentSV();
        const OTHER_TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        const FOUND = await INVITE_LINK_REPO.findByIdAndTournamentIdSV(link.id, OTHER_TOURNAMENT.id);

        expect(FOUND).toBeNull();
      });

      it('returns the link when tournamentId matches', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        const FOUND = await INVITE_LINK_REPO.findByIdAndTournamentIdSV(link.id, TOURNAMENT.id);

        expect(FOUND?.id).toBe(link.id);
      });
    });

    describe('listByTournamentIdWithRegistrantsSV', () => {
      it('returns registrants[] with AUTHENTICATED and GUEST display names, never exposing the token', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        const AUTH_PLAYER = await PRISMA.user.create({
          data: { email: `player-invite-link-${Date.now()}@test.local`, name: 'Jugador Autenticado' },
        });
        const AUTH_REGISTRATION = await PRISMA.tournamentRegistration.create({
          data: {
            tournamentId: TOURNAMENT.id,
            userId: AUTH_PLAYER.id,
            status: 'PENDING',
            inviteLinkId: link.id,
          },
        });
        const GUEST_REGISTRATION = await PRISMA.tournamentRegistration.create({
          data: {
            tournamentId: TOURNAMENT.id,
            registrationType: 'GUEST',
            status: 'PENDING',
            guestName: 'Invitado Via Link',
            registeredByUserId: organizerUserId,
            inviteLinkId: link.id,
          },
        });

        const LIST = await INVITE_LINK_REPO.listByTournamentIdWithRegistrantsSV(TOURNAMENT.id);
        const LISTED_LINK = LIST.find((_l) => _l.id === link.id);

        expect(LISTED_LINK).toBeDefined();
        expect(LISTED_LINK?.registrants).toHaveLength(2);
        expect((LISTED_LINK as Record<string, unknown>).token).toBeUndefined();
        expect((LISTED_LINK as Record<string, unknown>).tokenHash).toBeUndefined();

        const AUTH_ENTRY = LISTED_LINK?.registrants.find((_r) => _r.registrationId === AUTH_REGISTRATION.id);
        expect(AUTH_ENTRY?.type).toBe('AUTHENTICATED');
        expect(AUTH_ENTRY?.displayName).toBe('Jugador Autenticado');

        const GUEST_ENTRY = LISTED_LINK?.registrants.find((_r) => _r.registrationId === GUEST_REGISTRATION.id);
        expect(GUEST_ENTRY?.type).toBe('GUEST');
        expect(GUEST_ENTRY?.displayName).toBe('Invitado Via Link');
      });
    });

    describe('incrementUsesCountSV / revokeSV', () => {
      it('increments usesCount by 1 on each call', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        await INVITE_LINK_REPO.incrementUsesCountSV(link.id);
        await INVITE_LINK_REPO.incrementUsesCountSV(link.id);

        const ROW = await PRISMA.tournamentInviteLink.findUniqueOrThrow({ where: { id: link.id } });
        expect(ROW.usesCount).toBe(2);
      });

      it('revokeSV is idempotent: revoking twice keeps the same revokedAt', async () => {
        const TOURNAMENT = await createTournamentSV();
        const { link } = await INVITE_LINK_REPO.createSV({
          tournamentId: TOURNAMENT.id,
          createdByUserId: organizerUserId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: null,
        });

        await INVITE_LINK_REPO.revokeSV(link.id);
        const FIRST = await PRISMA.tournamentInviteLink.findUniqueOrThrow({ where: { id: link.id } });
        expect(FIRST.revokedAt).not.toBeNull();

        await INVITE_LINK_REPO.revokeSV(link.id);
        const SECOND = await PRISMA.tournamentInviteLink.findUniqueOrThrow({ where: { id: link.id } });
        expect(SECOND.revokedAt?.getTime()).toBe(FIRST.revokedAt?.getTime());
      });
    });
  },
);
