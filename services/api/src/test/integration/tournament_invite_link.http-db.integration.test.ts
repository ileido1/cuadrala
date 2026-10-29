/**
 * Pruebas end-to-end (HTTP + DB) de `tournament-invite-link` (issue #47),
 * fase 5 — presentación y wiring (T14-T19). Cubre la tabla de contrato
 * completa de `openspec/changes/issue-47-tournament-invite-link/spec.md`:
 * los 5 endpoints, happy paths autenticado/invitado, expirado/revocado/
 * agotado, torneo cerrado, cupos agotados, 403 sin autoridad, 404 torneo
 * inexistente, 404 link de otro torneo al revocar, 400 antes de tocar DB
 * con token de largo inválido y 422 con `expiresAt`/`maxUses` fuera de rango.
 *
 * Primer punto donde el flujo completo del backend se ejercita junto: hasta
 * esta fase T7-T13 solo se probaron con mocks/DB directa, nunca a través del
 * router real.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Tournament invite link (HTTP + DB)', () => {
  let sportId: string;
  let presetAmericanoId: string;
  let categoryId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    const CATALOG = await ensureTestCatalogSV();
    sportId = CATALOG.sportPadelId;
    presetAmericanoId = CATALOG.presetAmericanoId;
    const CAT = await createTestCategorySV(sportId, `invite-link-e2e-${Date.now()}`, 'Cat Invite Link E2E');
    categoryId = CAT.id;
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  async function makeUserSV(_label: string) {
    const TS = Date.now();
    const USER = await PRISMA.user.create({
      data: {
        email: `${_label}-${TS}-${Math.random().toString(36).slice(2)}@test.local`,
        name: _label,
      },
    });
    return { userId: USER.id, token: signAccessTokenSV(USER.id, USER.email) };
  }

  async function createTournamentSV(
    _organizerUserId: string,
    _extra: {
      status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      maxSlots?: number | null;
      isCompetitive?: boolean;
      inscriptionPrice?: number | null;
      startsAt?: Date | null;
      registrationClosesAt?: Date | null;
    } = {},
  ) {
    return PRISMA.tournament.create({
      data: {
        name: `Torneo Invite Link E2E ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        categoryId,
        sportId,
        formatPresetId: presetAmericanoId,
        organizerUserId: _organizerUserId,
        status: _extra.status ?? 'OPEN',
        ...(_extra.maxSlots !== undefined ? { maxSlots: _extra.maxSlots } : {}),
        ...(_extra.isCompetitive !== undefined ? { isCompetitive: _extra.isCompetitive } : {}),
        ...(_extra.inscriptionPrice !== undefined ? { inscriptionPrice: _extra.inscriptionPrice } : {}),
        ...(_extra.startsAt !== undefined ? { startsAt: _extra.startsAt } : {}),
        ...(_extra.registrationClosesAt !== undefined
          ? { registrationClosesAt: _extra.registrationClosesAt }
          : {}),
      },
    });
  }

  async function createLinkSV(
    _tournamentId: string,
    _organizerToken: string,
    _body: Record<string, unknown> = {},
  ) {
    return request(APP)
      .post(`/api/v1/tournaments/${_tournamentId}/invite-links`)
      .send(_body)
      .set('Authorization', `Bearer ${_organizerToken}`)
      .set('Content-Type', 'application/json');
  }

  describe('POST /tournaments/:tournamentId/invite-links', () => {
    it('creates a link with the raw token, expiresAt default +30d and usesCount 0', async () => {
      const ORGANIZER = await makeUserSV('til-create-organizer');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const RES = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);

      expect(RES.status).toBe(201);
      const DATA = RES.body.data;
      expect(typeof DATA.token).toBe('string');
      expect(DATA.token.length).toBeGreaterThanOrEqual(40);
      expect(DATA.url).toBe(DATA.deepLink);
      expect(DATA.url).toContain(`/invite/${DATA.token}`);
      expect(DATA.maxUses).toBeNull();
      expect(DATA.usesCount).toBe(0);
      expect(DATA.revokedAt).toBeNull();

      const ROW = await PRISMA.tournamentInviteLink.findUnique({ where: { id: DATA.id } });
      expect(ROW).not.toBeNull();
      //? El token crudo nunca se persiste (NFR-TIL-001): la fila no tiene ninguna
      //? columna con el valor crudo devuelto por la API.
      expect(JSON.stringify(ROW)).not.toContain(DATA.token);
    });

    it('responds 403 NO_AUTORIZADO when the actor is neither organizer nor venue staff', async () => {
      const ORGANIZER = await makeUserSV('til-create-organizer-2');
      const OUTSIDER = await makeUserSV('til-create-outsider');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const RES = await createLinkSV(TOURNAMENT.id, OUTSIDER.token);

      expect(RES.status).toBe(403);
      expect(RES.body.code).toBe('NO_AUTORIZADO');

      const COUNT = await PRISMA.tournamentInviteLink.count({ where: { tournamentId: TOURNAMENT.id } });
      expect(COUNT).toBe(0);
    });

    it('responds 404 TORNEO_NO_ENCONTRADO for a non-existent tournament', async () => {
      const ORGANIZER = await makeUserSV('til-create-404');
      const FAKE_ID = '00000000-0000-0000-0000-000000000000';

      const RES = await createLinkSV(FAKE_ID, ORGANIZER.token);

      expect(RES.status).toBe(404);
      expect(RES.body.code).toBe('TORNEO_NO_ENCONTRADO');
    });

    it('responds 422 when expiresAt override is outside [now+1h, now+180d]', async () => {
      const ORGANIZER = await makeUserSV('til-create-422-expires');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const RES = await createLinkSV(TOURNAMENT.id, ORGANIZER.token, {
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      expect(RES.status).toBe(422);
    });

    it('responds 422 when maxUses is 0 or negative', async () => {
      const ORGANIZER = await makeUserSV('til-create-422-maxuses');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const RES_ZERO = await createLinkSV(TOURNAMENT.id, ORGANIZER.token, { maxUses: 0 });
      expect(RES_ZERO.status).toBe(422);

      const RES_NEGATIVE = await createLinkSV(TOURNAMENT.id, ORGANIZER.token, { maxUses: -1 });
      expect(RES_NEGATIVE.status).toBe(422);
    });
  });

  describe('GET /tournaments/:tournamentId/invite-links', () => {
    it('lists links with their registrants, never exposing token/tokenHash', async () => {
      const ORGANIZER = await makeUserSV('til-list-organizer');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      const TOKEN = CREATED.body.data.token as string;

      await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({ name: 'Invitado Listado', email: 'invitado-listado@test.local' })
        .set('Content-Type', 'application/json');

      const RES = await request(APP)
        .get(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links`)
        .set('Authorization', `Bearer ${ORGANIZER.token}`);

      expect(RES.status).toBe(200);
      expect(Array.isArray(RES.body.data)).toBe(true);
      const LINK_ROW = RES.body.data.find((_l: { id: string }) => _l.id === CREATED.body.data.id);
      expect(LINK_ROW).toBeDefined();
      expect(LINK_ROW.registrants).toHaveLength(1);
      expect(LINK_ROW.registrants[0].type).toBe('GUEST');
      expect(LINK_ROW.registrants[0].displayName).toBe('Invitado Listado');
      expect(LINK_ROW.token).toBeUndefined();
      expect(LINK_ROW.tokenHash).toBeUndefined();
      expect(JSON.stringify(RES.body)).not.toContain(TOKEN);
    });

    it('responds 403/404 with the same organizer-access rules as creation', async () => {
      const ORGANIZER = await makeUserSV('til-list-organizer-2');
      const OUTSIDER = await makeUserSV('til-list-outsider');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const FORBIDDEN_RES = await request(APP)
        .get(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links`)
        .set('Authorization', `Bearer ${OUTSIDER.token}`);
      expect(FORBIDDEN_RES.status).toBe(403);

      const NOT_FOUND_RES = await request(APP)
        .get('/api/v1/tournaments/00000000-0000-0000-0000-000000000000/invite-links')
        .set('Authorization', `Bearer ${ORGANIZER.token}`);
      expect(NOT_FOUND_RES.status).toBe(404);
    });
  });

  describe('DELETE /tournaments/:tournamentId/invite-links/:linkId', () => {
    it('revokes an active link idempotently, and blocks later registration with ENLACE_REVOCADO', async () => {
      const ORGANIZER = await makeUserSV('til-revoke-organizer');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      const LINK_ID = CREATED.body.data.id as string;
      const TOKEN = CREATED.body.data.token as string;

      const FIRST_DELETE = await request(APP)
        .delete(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links/${LINK_ID}`)
        .set('Authorization', `Bearer ${ORGANIZER.token}`);
      expect(FIRST_DELETE.status).toBe(204);

      const SECOND_DELETE = await request(APP)
        .delete(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links/${LINK_ID}`)
        .set('Authorization', `Bearer ${ORGANIZER.token}`);
      expect(SECOND_DELETE.status).toBe(204);

      const REGISTER_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({ name: 'Post Revoke', email: 'post-revoke@test.local' })
        .set('Content-Type', 'application/json');
      expect(REGISTER_RES.status).toBe(409);
      expect(REGISTER_RES.body.code).toBe('ENLACE_REVOCADO');
    });

    it('responds 403 without mutating when the actor has no authority', async () => {
      const ORGANIZER = await makeUserSV('til-revoke-organizer-2');
      const OUTSIDER = await makeUserSV('til-revoke-outsider');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);

      const RES = await request(APP)
        .delete(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links/${CREATED.body.data.id}`)
        .set('Authorization', `Bearer ${OUTSIDER.token}`);
      expect(RES.status).toBe(403);

      const ROW = await PRISMA.tournamentInviteLink.findUnique({ where: { id: CREATED.body.data.id } });
      expect(ROW?.revokedAt).toBeNull();
    });

    it('responds 404 ENLACE_NO_ENCONTRADO when linkId belongs to another tournament', async () => {
      const ORGANIZER = await makeUserSV('til-revoke-organizer-3');
      const TOURNAMENT_A = await createTournamentSV(ORGANIZER.userId);
      const TOURNAMENT_B = await createTournamentSV(ORGANIZER.userId);
      const LINK_B = await createLinkSV(TOURNAMENT_B.id, ORGANIZER.token);

      const RES = await request(APP)
        .delete(`/api/v1/tournaments/${TOURNAMENT_A.id}/invite-links/${LINK_B.body.data.id}`)
        .set('Authorization', `Bearer ${ORGANIZER.token}`);

      expect(RES.status).toBe(404);
      expect(RES.body.code).toBe('ENLACE_NO_ENCONTRADO');
    });
  });

  describe('GET /public/tournament-invite-links/:token', () => {
    it('returns the tournament preview for a valid token', async () => {
      const ORGANIZER = await makeUserSV('til-preview-organizer');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);

      const RES = await request(APP).get(
        `/api/v1/public/tournament-invite-links/${CREATED.body.data.token}`,
      );

      expect(RES.status).toBe(200);
      expect(RES.body.data.tournamentId).toBe(TOURNAMENT.id);
      expect(RES.body.data.acceptsRegistration).toBe(true);
    });

    it('responds 400 before touching the DB when the token length is invalid', async () => {
      const COUNT_BEFORE = await PRISMA.tournamentInviteLink.count();

      const RES = await request(APP).get('/api/v1/public/tournament-invite-links/short-token');

      expect(RES.status).toBe(400);
      expect(await PRISMA.tournamentInviteLink.count()).toBe(COUNT_BEFORE);
    });

    it('responds 410 ENLACE_INVALIDO for an expired link', async () => {
      const ORGANIZER = await makeUserSV('til-preview-expired');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      await PRISMA.tournamentInviteLink.update({
        where: { id: CREATED.body.data.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const RES = await request(APP).get(
        `/api/v1/public/tournament-invite-links/${CREATED.body.data.token}`,
      );

      expect(RES.status).toBe(410);
      expect(RES.body.code).toBe('ENLACE_INVALIDO');
    });

    it('responds 409 ENLACE_AGOTADO once usesCount reaches maxUses', async () => {
      const ORGANIZER = await makeUserSV('til-preview-exhausted');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token, { maxUses: 1 });
      await PRISMA.tournamentInviteLink.update({
        where: { id: CREATED.body.data.id },
        data: { usesCount: 1 },
      });

      const RES = await request(APP).get(
        `/api/v1/public/tournament-invite-links/${CREATED.body.data.token}`,
      );

      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('ENLACE_AGOTADO');
    });
  });

  describe('POST /public/tournament-invite-links/:token/register', () => {
    it('registers the authenticated actor, incrementing usesCount only on the real create', async () => {
      const ORGANIZER = await makeUserSV('til-register-auth-organizer');
      const PLAYER = await makeUserSV('til-register-auth-player');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      const TOKEN = CREATED.body.data.token as string;

      const FIRST_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({})
        .set('Authorization', `Bearer ${PLAYER.token}`)
        .set('Content-Type', 'application/json');

      expect(FIRST_RES.status).toBe(201);
      expect(FIRST_RES.body.data.registrationType).toBe('AUTHENTICATED');
      expect(FIRST_RES.body.data.tournamentId).toBe(TOURNAMENT.id);
      expect(FIRST_RES.body.data.status).toBe('PENDING');

      const REGISTRATION = await PRISMA.tournamentRegistration.findUnique({
        where: { id: FIRST_RES.body.data.registrationId },
      });
      expect(REGISTRATION?.inviteLinkId).toBe(CREATED.body.data.id);

      const LINK_AFTER_FIRST = await PRISMA.tournamentInviteLink.findUnique({
        where: { id: CREATED.body.data.id },
      });
      expect(LINK_AFTER_FIRST?.usesCount).toBe(1);

      //? Reintento idempotente: misma inscripción, sin incrementar usesCount de nuevo.
      const SECOND_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({})
        .set('Authorization', `Bearer ${PLAYER.token}`)
        .set('Content-Type', 'application/json');
      expect(SECOND_RES.body.data.registrationId).toBe(FIRST_RES.body.data.registrationId);

      const LINK_AFTER_SECOND = await PRISMA.tournamentInviteLink.findUnique({
        where: { id: CREATED.body.data.id },
      });
      expect(LINK_AFTER_SECOND?.usesCount).toBe(1);
    });

    it('registers a guest without a session, attributing registeredByUserId to the link creator', async () => {
      const ORGANIZER = await makeUserSV('til-register-guest-organizer');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      const TOKEN = CREATED.body.data.token as string;

      const RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({ name: 'Juan Pérez', email: 'juan-perez@test.local' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(201);
      expect(RES.body.data.registrationType).toBe('GUEST');

      const REGISTRATION = await PRISMA.tournamentRegistration.findUnique({
        where: { id: RES.body.data.registrationId },
      });
      expect(REGISTRATION?.registeredByUserId).toBe(ORGANIZER.userId);
      expect(REGISTRATION?.guestName).toBe('Juan Pérez');
      expect(REGISTRATION?.inviteLinkId).toBe(CREATED.body.data.id);

      //? GUEST nunca es idempotente: un segundo registro con el mismo link suma otro uso.
      const SECOND_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${TOKEN}/register`)
        .send({ name: 'Otro Invitado', email: 'otro-invitado@test.local' })
        .set('Content-Type', 'application/json');
      expect(SECOND_RES.status).toBe(201);

      const LINK_AFTER = await PRISMA.tournamentInviteLink.findUnique({
        where: { id: CREATED.body.data.id },
      });
      expect(LINK_AFTER?.usesCount).toBe(2);
    });

    it('responds 400 on invalid guest data without writing to the DB', async () => {
      const ORGANIZER = await makeUserSV('til-register-guest-invalid');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      const COUNT_BEFORE = await PRISMA.tournamentRegistration.count();

      const RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${CREATED.body.data.token}/register`)
        .send({ name: '', email: 'no-es-un-email' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(await PRISMA.tournamentRegistration.count()).toBe(COUNT_BEFORE);
    });

    it('responds 400 before touching the DB when the token length is invalid', async () => {
      const COUNT_BEFORE = await PRISMA.tournamentRegistration.count();

      const RES = await request(APP)
        .post('/api/v1/public/tournament-invite-links/short-token/register')
        .send({ name: 'Nombre', email: 'nombre@test.local' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(400);
      expect(await PRISMA.tournamentRegistration.count()).toBe(COUNT_BEFORE);
    });

    it('responds 410/409 for expired, revoked or exhausted links', async () => {
      const ORGANIZER = await makeUserSV('til-register-link-states');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId);

      const EXPIRED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      await PRISMA.tournamentInviteLink.update({
        where: { id: EXPIRED.body.data.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const EXPIRED_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${EXPIRED.body.data.token}/register`)
        .send({ name: 'Nombre', email: 'nombre@test.local' })
        .set('Content-Type', 'application/json');
      expect(EXPIRED_RES.status).toBe(410);
      expect(EXPIRED_RES.body.code).toBe('ENLACE_INVALIDO');

      const REVOKED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);
      await request(APP)
        .delete(`/api/v1/tournaments/${TOURNAMENT.id}/invite-links/${REVOKED.body.data.id}`)
        .set('Authorization', `Bearer ${ORGANIZER.token}`);
      const REVOKED_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${REVOKED.body.data.token}/register`)
        .send({ name: 'Nombre', email: 'nombre@test.local' })
        .set('Content-Type', 'application/json');
      expect(REVOKED_RES.status).toBe(409);
      expect(REVOKED_RES.body.code).toBe('ENLACE_REVOCADO');

      const EXHAUSTED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token, { maxUses: 1 });
      await PRISMA.tournamentInviteLink.update({
        where: { id: EXHAUSTED.body.data.id },
        data: { usesCount: 1 },
      });
      const EXHAUSTED_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${EXHAUSTED.body.data.token}/register`)
        .send({ name: 'Nombre', email: 'nombre@test.local' })
        .set('Content-Type', 'application/json');
      expect(EXHAUSTED_RES.status).toBe(409);
      expect(EXHAUSTED_RES.body.code).toBe('ENLACE_AGOTADO');
    });

    it('responds 409 TORNEO_CERRADO when the tournament roster is no longer open', async () => {
      const ORGANIZER = await makeUserSV('til-register-closed');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId, { status: 'IN_PROGRESS' });
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);

      const RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${CREATED.body.data.token}/register`)
        .send({ name: 'Nombre', email: 'nombre@test.local' })
        .set('Content-Type', 'application/json');

      expect(RES.status).toBe(409);
      expect(RES.body.code).toBe('TORNEO_CERRADO');
    });

    it('responds 409 CUPOS_AGOTADOS when maxSlots is reached', async () => {
      const ORGANIZER = await makeUserSV('til-register-full');
      const TOURNAMENT = await createTournamentSV(ORGANIZER.userId, { maxSlots: 1 });
      const CREATED = await createLinkSV(TOURNAMENT.id, ORGANIZER.token);

      const FIRST_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${CREATED.body.data.token}/register`)
        .send({ name: 'Primero', email: 'primero@test.local' })
        .set('Content-Type', 'application/json');
      expect(FIRST_RES.status).toBe(201);

      const SECOND_RES = await request(APP)
        .post(`/api/v1/public/tournament-invite-links/${CREATED.body.data.token}/register`)
        .send({ name: 'Segundo', email: 'segundo@test.local' })
        .set('Content-Type', 'application/json');

      expect(SECOND_RES.status).toBe(409);
      expect(SECOND_RES.body.code).toBe('CUPOS_AGOTADOS');
    });
  });
});
