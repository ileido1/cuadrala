import { randomUUID } from 'node:crypto';
import { PrismaQuickMatchRepository } from '../../infrastructure/adapters/prisma_quick_match_repository.js';
import { Prisma } from '../../generated/prisma/client.js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { signAccessTokenSV } from '../../infrastructure/jwt_tokens.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ensureTestCatalogSV } from '../helpers/catalog-seed.js';
import { HAS_INTEGRATION_DATABASE } from '../helpers/integration-env.js';
import { resetDatabaseForTestsSV } from '../helpers/reset-db.js';
import { createTestCategorySV } from '../helpers/test-category.js';

const APP = createApp();
type Player = { id: string; token: string };

//? A1 (odd/tasks/quick-match-ready-check.md, L15–L16): una oferta de partida
//? abierta bloqueada en el lock de alcance no debe pisar a un jugador que una
//? reposición movió a otro grupo mientras tanto.
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match open-match offer race (HTTP + DB)', () => {
  let sportId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    sportId = (await ensureTestCatalogSV()).sportPadelId;
    await PRISMA.feeRule.create({ data: { scope: 'MATCH', type: 'FIXED', value: new Prisma.Decimal(0), isActive: true } });
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  //? Cada test usa su propia categoría para que los jugadores (y su
  //? disponibilidad guardada) de un test no se crucen con los de otro.
  async function setupSV(_label: string, _count: number, _availabilityCount = 0, _date = '2026-12-01'): Promise<{ categoryId: string; players: Player[]; invitees: Player[] }> {
    const CATEGORY_ID = (await createTestCategorySV(sportId, `${_label}-${Date.now()}`, _label.toUpperCase())).id;
    const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(`${_date}T00:00:00.000Z`).getUTCDay()]!;
    const CREATE = async (_index: number, _withAvailability: boolean): Promise<Player> => {
      const EMAIL = `${_label}-${Date.now()}-${_index}-${Math.random().toString(36).slice(2, 8)}@test.local`;
      const USER = await PRISMA.user.create({ data: { email: EMAIL, name: `${_label} ${_index}` } });
      await PRISMA.userCategory.create({ data: { userId: USER.id, categoryId: CATEGORY_ID } });
      if (_withAvailability) {
        //? La invitación por disponibilidad cruza el deporte+categoría del perfil (UserSportCategory).
        await PRISMA.userSportCategory.create({ data: { userId: USER.id, sportId, categoryId: CATEGORY_ID } });
        await PRISMA.userAvailability.create({ data: { userId: USER.id, dayOfWeek: DAY_OF_WEEK as never, slot: 'EVENING' } });
      }
      return { id: USER.id, token: signAccessTokenSV(USER.id, EMAIL) };
    };
    const PLAYERS: Player[] = [];
    for (let i = 0; i < _count; i++) PLAYERS.push(await CREATE(i, false));
    const INVITEES: Player[] = [];
    for (let i = 0; i < _availabilityCount; i++) INVITEES.push(await CREATE(100 + i, true));
    return { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES };
  }

  function start(_player: Player, _categoryId: string, _date = '2026-12-01', _includeOpenMatches = false) {
    return request(APP).post('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`)
      .send({ sportId, categoryId: _categoryId, day: 'CUSTOM', date: _date, slots: ['EVENING'], widenLevel: false, zoneKm: 10, includeOpenMatches: _includeOpenMatches });
  }
  const searchOf = (_player: Player) => PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: _player.id }, include: { proposal: true } });


  it('R-A1 interleaving: open-match offer blocked on the scope lock does not overwrite a searcher moved meanwhile', async () => {
    const DATE = '2027-05-05';
    const { categoryId: C, players: P } = await setupSV('ra1', 2, 0, DATE);
    expect((await start(P[0]!, C, DATE)).body.data).toMatchObject({ proposal: null });
    const OWN = await searchOf(P[0]!);
    expect(OWN.proposal?.status).toBe('LOBBY');
    const OPEN = await PRISMA.match.create({ data: { sportId, categoryId: C, organizerUserId: P[1]!.id, type: 'REGULAR', status: 'SCHEDULED', scheduledAt: new Date(`${DATE}T22:00:00.000Z`), maxParticipants: 4, participants: { create: [{ userId: P[1]!.id }] } } });
    const SCOPE = `${sportId}:${C}:${OWN.targetDate.toISOString()}`;
    const G2 = randomUUID();
    let offer: Promise<unknown> | null = null;
    await PRISMA.$transaction(async (_tx) => {
      await _tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${SCOPE}))`;
      offer = new PrismaQuickMatchRepository().createOpenProposalSV(OWN.id, { matchId: OPEN.id, participantIds: [P[1]!.id] }, new Date(Date.now() + 120_000));
      await new Promise((_r) => setTimeout(_r, 400));
      //? simulate a refill pulling P0 into a ready check of another group
      await _tx.quickMatchProposal.update({ where: { searchId: OWN.id }, data: { status: 'PENDING', groupKey: G2, expiresAt: new Date(Date.now() + 120_000) } });
      await _tx.quickMatchSearch.update({ where: { id: OWN.id }, data: { status: 'PROPOSAL' } });
    }, { timeout: 10_000 });
    const RESULT = await offer;
    const AFTER = await searchOf(P[0]!);
    console.log('R-A1', RESULT === null ? 'null' : 'offer', AFTER.status, AFTER.proposal?.type, AFTER.proposal?.status);
    expect(RESULT).toBeNull();
    expect(AFTER).toMatchObject({ status: 'PROPOSAL', proposal: { type: 'NEW_GROUP', status: 'PENDING', groupKey: G2 } });
  });
});
