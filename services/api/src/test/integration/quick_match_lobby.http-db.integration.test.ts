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

//? Lobby (odd/tasks/quick-match-ready-check.md, S1, S2, S12–S14): los que buscan
//? se juntan de a uno en un lobby; los invitados por disponibilidad entran solo si
//? aceptan; al llegar a 4 arranca el ready check.
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match lobby (HTTP + DB)', () => {
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
  const get = (_player: Player) => request(APP).get('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`);
  const confirm = (_player: Player, _body: Record<string, unknown> = {}) => request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${_player.token}`).send(_body);
  const dismiss = (_player: Player) => request(APP).post('/api/v1/quick-match/proposal/dismiss').set('Authorization', `Bearer ${_player.token}`).send({});
  const searchOf = (_player: Player) => PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: _player.id }, include: { proposal: true } });

  const cancel = (_player: Player) => request(APP).delete('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`);
  async function payloadsFor(_player: Player): Promise<Array<{ kind?: string; memberCount?: number }>> {
    const ROWS = await PRISMA.notificationDelivery.findMany({ where: { userId: _player.id, event: { type: 'QUICK_MATCH_PROPOSAL' } }, include: { event: { select: { payload: true } } }, orderBy: { createdAt: 'asc' } });
    return ROWS.map((_row) => (_row.event.payload ?? {}) as { kind?: string; memberCount?: number });
  }
  const kindsFor = async (_player: Player) => (await payloadsFor(_player)).map((_p) => _p.kind);

  it('S1: should put two compatible searchers in the same lobby right away', async () => {
    const DATE = '2027-01-04';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-two', 2, 0, DATE);
    const ALONE = await start(PLAYERS[0]!, CATEGORY_ID, DATE);
    expect(ALONE.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null, acceptedCount: 0 });

    const SECOND = await start(PLAYERS[1]!, CATEGORY_ID, DATE);
    expect(SECOND.status).toBe(201);
    expect(SECOND.body.data).toMatchObject({ status: 'SEARCHING', acceptedCount: 0, proposal: { type: 'NEW_GROUP', status: 'LOBBY' } });
    expect(SECOND.body.data.proposal.expiresAt).toBeTruthy();
    const FIRST = await get(PLAYERS[0]!);
    expect(FIRST.body.data).toMatchObject({ status: 'SEARCHING', acceptedCount: 0, proposal: { type: 'NEW_GROUP', status: 'LOBBY', groupKey: SECOND.body.data.proposal.groupKey } });
    for (const RES of [FIRST, SECOND]) expect([...RES.body.data.proposal.playerIds].sort()).toEqual(PLAYERS.map((_p) => _p.id).sort());
  });

  it('S1/S13: should add a third searcher to the same lobby and notify the members already in it', async () => {
    const DATE = '2027-01-05';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-three', 3, 0, DATE);
    for (const PLAYER of PLAYERS.slice(0, 2)) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;
    expect(await payloadsFor(PLAYERS[0]!)).toEqual([expect.objectContaining({ kind: 'LOBBY_JOINED', memberCount: 2 })]);
    expect(await payloadsFor(PLAYERS[1]!)).toEqual([]);

    const THIRD = await start(PLAYERS[2]!, CATEGORY_ID, DATE);
    expect(THIRD.body.data).toMatchObject({ status: 'SEARCHING', proposal: { status: 'LOBBY', groupKey: GROUP_KEY } });
    expect(THIRD.body.data.proposal.playerIds).toHaveLength(3);
    for (const INDEX of [0, 1]) expect((await searchOf(PLAYERS[INDEX]!)).proposal!.playerIds).toHaveLength(3);
    expect((await payloadsFor(PLAYERS[0]!)).at(-1)).toMatchObject({ kind: 'LOBBY_JOINED', memberCount: 3 });
    expect((await payloadsFor(PLAYERS[1]!)).at(-1)).toMatchObject({ kind: 'LOBBY_JOINED', memberCount: 3 });
    expect(await payloadsFor(PLAYERS[2]!)).toEqual([]);
  });

  it('S2: should start the ready check for all 4 when the 4th searcher joins the lobby', async () => {
    const DATE = '2027-01-06';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-four', 4, 0, DATE);
    for (const PLAYER of PLAYERS.slice(0, 3)) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;

    const FOURTH = await start(PLAYERS[3]!, CATEGORY_ID, DATE);
    expect(FOURTH.body.data).toMatchObject({ status: 'PROPOSAL', acceptedCount: 0, proposal: { type: 'NEW_GROUP', status: 'PENDING', groupKey: GROUP_KEY } });
    const ROWS = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY }, include: { search: true } });
    expect(ROWS).toHaveLength(4);
    expect(ROWS.every((_r) => _r.status === 'PENDING' && _r.search.status === 'PROPOSAL' && _r.playerIds.length === 4)).toBe(true);
    expect(new Set(ROWS.map((_r) => _r.expiresAt.getTime())).size).toBe(1);
    expect(ROWS[0]!.expiresAt.getTime() - Date.now()).toBeGreaterThan(60_000);
    for (const INDEX of [0, 1, 2]) expect(await kindsFor(PLAYERS[INDEX]!)).toContain('READY_CHECK');
    expect(await kindsFor(PLAYERS[3]!)).not.toContain('READY_CHECK');
  });

  it('S12: should invite only as many availability players as there are free slots, without making them members', async () => {
    const DATE = '2027-01-07';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-inv', 2, 3, DATE);
    const invitationsSV = async () => (await Promise.all(INVITEES.map(async (_p) => ({ INVITEE: _p, SEARCH: await PRISMA.quickMatchSearch.findUnique({ where: { userId: _p.id }, include: { proposal: true } }) })))).filter((_i) => _i.SEARCH !== null);

    //? 1. Solo: ve que está solo, pero ya invita a 3 (los cupos libres)
    expect((await start(PLAYERS[0]!, CATEGORY_ID, DATE)).body.data).toMatchObject({ proposal: null, noMatchYet: true });
    const ALONE = await invitationsSV();
    expect(ALONE).toHaveLength(3);
    for (const { INVITEE, SEARCH } of ALONE) {
      expect(SEARCH).toMatchObject({ status: 'PROPOSAL', invitedByAvailability: true, proposal: { type: 'NEW_GROUP', status: 'PENDING', playerIds: [PLAYERS[0]!.id] } });
      expect(SEARCH!.proposal!.expiresAt.getTime() - Date.now()).toBeGreaterThan(60_000);
      expect(await kindsFor(INVITEE)).toEqual(['INVITATION']);
    }

    //? 2. Llega otro buscador: quedan 2 cupos, así que sobra una invitación y se retira
    expect((await start(PLAYERS[1]!, CATEGORY_ID, DATE)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;
    const LEFT = await invitationsSV();
    expect(LEFT).toHaveLength(2);
    for (const { INVITEE, SEARCH } of LEFT) {
      expect(SEARCH).toMatchObject({ proposal: { status: 'PENDING', groupKey: GROUP_KEY } });
      expect([...SEARCH!.proposal!.playerIds].sort()).toEqual(PLAYERS.map((_p) => _p.id).sort());
      const VIEW = await get(INVITEE);
      expect(VIEW.body.data).toMatchObject({ status: 'PROPOSAL', invitedByAvailability: true, proposal: { status: 'PENDING' } });
      expect(VIEW.body.data.proposal.playerIds).toHaveLength(2);
    }
    //? El lobby no cuenta a los invitados hasta que aceptan.
    expect((await get(PLAYERS[0]!)).body.data).toMatchObject({ invitedByAvailability: false, proposal: { status: 'LOBBY' } });
    expect((await searchOf(PLAYERS[0]!)).proposal!.playerIds).toHaveLength(2);
  });

  it('S12: should form a lobby of 2 when an invitee accepts the invitation of a searcher who was alone', async () => {
    const DATE = '2027-01-16';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-lone', 1, 1, DATE);
    expect((await start(PLAYERS[0]!, CATEGORY_ID, DATE)).body.data.proposal).toBeNull();

    const ACCEPT = await confirm(INVITEES[0]!);
    expect(ACCEPT.status).toBe(200);
    expect(ACCEPT.body.data).toMatchObject({ status: 'SEARCHING', invitedByAvailability: false, proposal: { status: 'LOBBY' } });
    expect([...ACCEPT.body.data.proposal.playerIds].sort()).toEqual([PLAYERS[0]!.id, INVITEES[0]!.id].sort());
    const SEARCHER = await get(PLAYERS[0]!);
    expect(SEARCHER.body.data).toMatchObject({ status: 'SEARCHING', proposal: { status: 'LOBBY', groupKey: ACCEPT.body.data.proposal.groupKey } });
    expect(SEARCHER.body.data.proposal.playerIds).toHaveLength(2);
    expect((await payloadsFor(PLAYERS[0]!)).at(-1)).toMatchObject({ kind: 'LOBBY_JOINED', memberCount: 2 });
  });

  it('S12/S14: should withdraw the invitations of a lone searcher who leaves the queue', async () => {
    const DATE = '2027-01-17';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-lone-leave', 1, 2, DATE);
    expect((await start(PLAYERS[0]!, CATEGORY_ID, DATE)).status).toBe(201);
    for (const INVITEE of INVITEES) expect((await searchOf(INVITEE)).status).toBe('PROPOSAL');

    expect((await cancel(PLAYERS[0]!)).status).toBe(204);
    for (const INVITEE of INVITEES) {
      expect(await PRISMA.quickMatchSearch.findUnique({ where: { userId: INVITEE.id } })).toBeNull();
      expect((await confirm(INVITEES[0]!)).status).toBe(409);
    }
  });

  it('S12: should form one lobby of 3 when two invitees of a lone searcher accept at the same time', async () => {
    const DATE = '2027-01-18';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-lone-conc', 1, 2, DATE);
    expect((await start(PLAYERS[0]!, CATEGORY_ID, DATE)).status).toBe(201);

    const ACCEPTS = await Promise.all(INVITEES.map((_p) => confirm(_p)));
    expect(ACCEPTS.every((_r) => _r.status === 200)).toBe(true);
    const SEARCHES = await Promise.all([PLAYERS[0]!, ...INVITEES].map((_p) => searchOf(_p)));
    expect(new Set(SEARCHES.map((_s) => _s.proposal?.groupKey)).size).toBe(1);
    expect(SEARCHES.every((_s) => _s.status === 'SEARCHING' && _s.proposal?.status === 'LOBBY' && _s.proposal.playerIds.length === 3)).toBe(true);
  });

  it('S12: should never invite the same player twice for two lone searchers in the same scope', async () => {
    const DATE = '2027-01-19';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-lone-two', 2, 1, DATE);
    //? El invitado está disponible a la mañana y a la noche; cada buscador busca una franja distinta.
    const DAY_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(`${DATE}T00:00:00.000Z`).getUTCDay()]!;
    await PRISMA.userAvailability.create({ data: { userId: INVITEES[0]!.id, dayOfWeek: DAY_OF_WEEK as never, slot: 'MORNING' } });
    const startSlot = (_player: Player, _slot: string) => request(APP).post('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`)
      .send({ sportId, categoryId: CATEGORY_ID, day: 'CUSTOM', date: DATE, slots: [_slot], widenLevel: false, zoneKm: 10, includeOpenMatches: false });

    const RESPONSES = await Promise.all([startSlot(PLAYERS[0]!, 'EVENING'), startSlot(PLAYERS[1]!, 'MORNING')]);
    expect(RESPONSES.every((_r) => _r.status === 201 && _r.body.data.proposal === null)).toBe(true);
    await Promise.all(PLAYERS.map((_p) => get(_p)));

    const ROWS = await PRISMA.quickMatchProposal.findMany({ where: { search: { userId: INVITEES[0]!.id }, status: 'PENDING' } });
    expect(ROWS).toHaveLength(1);
    expect(await kindsFor(INVITEES[0]!)).toEqual(['INVITATION']);
  });

  it('S8/S12: should still offer a lone searcher an open match that appears later, withdrawing their invitations', async () => {
    const DATE = '2027-01-20';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-lone-open', 2, 1, DATE);
    expect((await start(PLAYERS[0]!, CATEGORY_ID, DATE, true)).body.data.proposal).toBeNull();
    expect((await searchOf(INVITEES[0]!)).status).toBe('PROPOSAL');
    const OPEN = await PRISMA.match.create({ data: { sportId, categoryId: CATEGORY_ID, organizerUserId: PLAYERS[1]!.id, type: 'REGULAR', status: 'SCHEDULED', scheduledAt: new Date(`${DATE}T22:00:00.000Z`), maxParticipants: 4, participants: { create: [{ userId: PLAYERS[1]!.id }] } } });

    const VIEW = await get(PLAYERS[0]!);
    expect(VIEW.body.data).toMatchObject({ status: 'PROPOSAL', proposal: { type: 'OPEN_MATCH', matchId: OPEN.id, status: 'PENDING' } });
    expect(await PRISMA.quickMatchSearch.findUnique({ where: { userId: INVITEES[0]!.id } })).toBeNull();
  });

  it('S12/S13/S2: should add an invitee who accepts to the lobby, and start the ready check when that makes 4', async () => {
    const DATE = '2027-01-08';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-acc', 2, 2, DATE);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;

    const FIRST = await confirm(INVITEES[0]!);
    expect(FIRST.status).toBe(200);
    expect(FIRST.body.data).toMatchObject({ status: 'SEARCHING', invitedByAvailability: false, acceptedCount: 0, proposal: { status: 'LOBBY', groupKey: GROUP_KEY } });
    expect(FIRST.body.data.proposal.playerIds).toHaveLength(3);
    for (const PLAYER of PLAYERS) {
      expect((await searchOf(PLAYER)).proposal!.playerIds).toHaveLength(3);
      expect((await payloadsFor(PLAYER)).at(-1)).toMatchObject({ kind: 'LOBBY_JOINED', memberCount: 3 });
    }

    const SECOND = await confirm(INVITEES[1]!);
    expect(SECOND.status).toBe(200);
    expect(SECOND.body.data).toMatchObject({ status: 'PROPOSAL', proposal: { status: 'PENDING', groupKey: GROUP_KEY } });
    const ROWS = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY }, include: { search: true } });
    expect(ROWS).toHaveLength(4);
    expect(ROWS.every((_r) => _r.status === 'PENDING' && _r.search.status === 'PROPOSAL' && _r.playerIds.length === 4)).toBe(true);
    for (const PLAYER of [...PLAYERS, INVITEES[0]!]) expect(await kindsFor(PLAYER)).toContain('READY_CHECK');
    expect(await kindsFor(INVITEES[1]!)).not.toContain('READY_CHECK');
  });

  it('S12: should cancel an invitee who declines and never invite them again that day', async () => {
    const DATE = '2027-01-09';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-dec', 2, 1, DATE);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    const DECLINE = await dismiss(INVITEES[0]!);
    expect(DECLINE.status).toBe(200);
    expect(DECLINE.body.data).toMatchObject({ status: 'CANCELLED', invitedByAvailability: true, proposal: { status: 'DISMISSED' } });
    for (const PLAYER of PLAYERS) await get(PLAYER);
    expect((await searchOf(INVITEES[0]!)).status).toBe('CANCELLED');
    expect(await kindsFor(INVITEES[0]!)).toEqual(['INVITATION']);
    expect((await searchOf(PLAYERS[0]!)).proposal).toMatchObject({ status: 'LOBBY', playerIds: expect.any(Array) });
    expect((await searchOf(PLAYERS[0]!)).proposal!.playerIds).toHaveLength(2);
  });

  it('S12: should expire an invitee who does not answer in time and never invite them again that day', async () => {
    const DATE = '2027-01-10';
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('lb-exp', 2, 1, DATE);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    await PRISMA.quickMatchProposal.updateMany({ where: { search: { userId: INVITEES[0]!.id } }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    expect((await get(PLAYERS[0]!)).status).toBe(200);
    expect(await searchOf(INVITEES[0]!)).toMatchObject({ status: 'EXPIRED', proposal: { status: 'EXPIRED' } });
    for (const PLAYER of PLAYERS) await get(PLAYER);
    expect((await searchOf(INVITEES[0]!)).status).toBe('EXPIRED');
    expect(await kindsFor(INVITEES[0]!)).toEqual(['INVITATION']);
  });

  it('S14: should keep a lobby of 3 going with the other 2 when one member leaves', async () => {
    const DATE = '2027-01-11';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-leave3', 3, 0, DATE);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;

    expect((await cancel(PLAYERS[1]!)).status).toBe(204);
    expect((await searchOf(PLAYERS[1]!)).status).toBe('CANCELLED');
    for (const INDEX of [0, 2]) {
      const VIEW = await get(PLAYERS[INDEX]!);
      expect(VIEW.body.data).toMatchObject({ status: 'SEARCHING', proposal: { status: 'LOBBY', groupKey: GROUP_KEY } });
      expect([...VIEW.body.data.proposal.playerIds].sort()).toEqual([PLAYERS[0]!.id, PLAYERS[2]!.id].sort());
    }
  });

  it('S14: should send the last member of a lobby of 2 back to plain searching when the other leaves', async () => {
    const DATE = '2027-01-12';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-leave2', 2, 0, DATE);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, DATE)).status).toBe(201);

    expect((await cancel(PLAYERS[0]!)).status).toBe(204);
    expect((await searchOf(PLAYERS[0]!)).status).toBe('CANCELLED');
    const VIEW = await get(PLAYERS[1]!);
    expect(VIEW.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null, acceptedCount: 0 });
  });

  it('S1: should form one lobby when two searchers arrive at the same time', async () => {
    const DATE = '2027-01-13';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-conc2', 2, 0, DATE);
    const RESPONSES = await Promise.all(PLAYERS.map((_p) => start(_p, CATEGORY_ID, DATE)));
    expect(RESPONSES.every((_r) => _r.status === 201)).toBe(true);
    const SEARCHES = await Promise.all(PLAYERS.map((_p) => searchOf(_p)));
    expect(SEARCHES.every((_s) => _s.proposal?.status === 'LOBBY')).toBe(true);
    expect(new Set(SEARCHES.map((_s) => _s.proposal!.groupKey)).size).toBe(1);
  });

  it('S1/S2: should end in a single group of 4 when four searchers arrive at the same time', async () => {
    const DATE = '2027-01-14';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-conc4', 4, 0, DATE);
    const RESPONSES = await Promise.all(PLAYERS.map((_p) => start(_p, CATEGORY_ID, DATE)));
    expect(RESPONSES.every((_r) => _r.status === 201)).toBe(true);
    const SEARCHES = await Promise.all(PLAYERS.map((_p) => searchOf(_p)));
    expect(new Set(SEARCHES.map((_s) => _s.proposal?.groupKey)).size).toBe(1);
    expect(SEARCHES.every((_s) => _s.status === 'PROPOSAL' && _s.proposal?.status === 'PENDING' && _s.proposal.playerIds.length === 4)).toBe(true);
  });

  it('S1/S2: should never put a player in two groups or a group over 4 when six searchers arrive at the same time', async () => {
    const DATE = '2027-01-15';
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('lb-conc6', 6, 0, DATE);
    const RESPONSES = await Promise.all(PLAYERS.map((_p) => start(_p, CATEGORY_ID, DATE)));
    expect(RESPONSES.every((_r) => _r.status === 201)).toBe(true);
    //? Una ronda de lecturas como la del polling de la app, también en paralelo.
    expect((await Promise.all(PLAYERS.map((_p) => get(_p)))).every((_r) => _r.status === 200)).toBe(true);

    const SEARCHES = await Promise.all(PLAYERS.map((_p) => searchOf(_p)));
    const BY_GROUP = new Map<string, string[]>();
    for (const SEARCH of SEARCHES) {
      if (SEARCH.proposal?.groupKey == null || !['LOBBY', 'PENDING', 'CONFIRMED'].includes(SEARCH.proposal.status)) continue;
      BY_GROUP.set(SEARCH.proposal.groupKey, [...(BY_GROUP.get(SEARCH.proposal.groupKey) ?? []), SEARCH.proposal.status]);
    }
    expect([...BY_GROUP.values()].map((_statuses) => _statuses.length).sort()).toEqual([2, 4]);
    expect([...BY_GROUP.values()].find((_statuses) => _statuses.length === 4)!.every((_status) => _status === 'PENDING')).toBe(true);
    expect([...BY_GROUP.values()].find((_statuses) => _statuses.length === 2)!.every((_status) => _status === 'LOBBY')).toBe(true);
  });
});
