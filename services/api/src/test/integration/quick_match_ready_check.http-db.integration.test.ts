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

//? Ready check tipo League of Legends (odd/tasks/quick-match-ready-check.md, S1–S8):
//? el grupo se forma solo con 4 jugadores y los 4 aceptan o rechazan a la vez.
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match ready check (HTTP + DB)', () => {
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

  async function formGroupSV(_label: string, _date = '2026-12-01'): Promise<{ categoryId: string; players: Player[]; groupKey: string }> {
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV(_label, 4, 0, _date);
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, _date)).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;
    return { categoryId: CATEGORY_ID, players: PLAYERS, groupKey: GROUP_KEY };
  }

  it('S1: should keep searching without a group when fewer than 4 players are available', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('rc-s1a', 3);
    for (const PLAYER of PLAYERS) {
      const RES = await start(PLAYER, CATEGORY_ID);
      expect(RES.status).toBe(201);
      expect(RES.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null, acceptedCount: 0 });
    }
    expect(await PRISMA.quickMatchProposal.count({ where: { search: { categoryId: CATEGORY_ID } } })).toBe(0);
  });

  it('S1: should form one group of 4 when the 4th compatible searcher arrives, and never add a 5th to it', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('rc-s1b', 5);
    for (const PLAYER of PLAYERS.slice(0, 3)) expect((await start(PLAYER, CATEGORY_ID)).status).toBe(201);
    const FOURTH = await start(PLAYERS[3]!, CATEGORY_ID);
    expect(FOURTH.status).toBe(201);
    expect(FOURTH.body.data).toMatchObject({ status: 'PROPOSAL', acceptedCount: 0, proposal: { type: 'NEW_GROUP', status: 'PENDING', matchId: null } });
    expect([...FOURTH.body.data.proposal.playerIds].sort()).toEqual(PLAYERS.slice(0, 4).map((_p) => _p.id).sort());

    const FIFTH = await start(PLAYERS[4]!, CATEGORY_ID);
    expect(FIFTH.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null });
    const GROUP = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: FOURTH.body.data.proposal.groupKey } });
    expect(GROUP).toHaveLength(4);
  });

  it('S1: should count saved availability toward the 4 and invite only the players needed', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s1c', 1, 4);
    const FIRST = await start(PLAYERS[0]!, CATEGORY_ID);
    expect(FIRST.body.data).toMatchObject({ status: 'PROPOSAL', acceptedCount: 0, proposal: { type: 'NEW_GROUP', status: 'PENDING' } });
    const MEMBERS: string[] = FIRST.body.data.proposal.playerIds;
    expect(MEMBERS).toHaveLength(4);
    const INVITED = INVITEES.filter((_p) => MEMBERS.includes(_p.id));
    expect(INVITED).toHaveLength(3);
    const NOT_INVITED = INVITEES.find((_p) => !MEMBERS.includes(_p.id))!;
    expect(await PRISMA.quickMatchSearch.findUnique({ where: { userId: NOT_INVITED.id } })).toBeNull();
    for (const INVITEE of INVITED) expect(await searchOf(INVITEE)).toMatchObject({ status: 'PROPOSAL', proposal: { status: 'PENDING' } });
  });

  it('S1: should not invite availability players when the total stays below 4', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s1d', 2, 1);
    expect((await start(PLAYERS[0]!, CATEGORY_ID)).status).toBe(201);
    const SECOND = await start(PLAYERS[1]!, CATEGORY_ID);
    expect(SECOND.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null });
    expect(await PRISMA.quickMatchSearch.findUnique({ where: { userId: INVITEES[0]!.id } })).toBeNull();
  });

  it('S2: should send the ready check to all 4 at once and notify everyone except the searcher who triggered it', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s2', 3, 1);
    expect((await start(PLAYERS[0]!, CATEGORY_ID)).status).toBe(201);
    expect((await start(PLAYERS[1]!, CATEGORY_ID)).status).toBe(201);
    const TRIGGER = await start(PLAYERS[2]!, CATEGORY_ID);
    expect(TRIGGER.body.data.status).toBe('PROPOSAL');

    const GROUP = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: TRIGGER.body.data.proposal.groupKey } });
    expect(GROUP).toHaveLength(4);
    expect(GROUP.every((_p) => _p.status === 'PENDING')).toBe(true);
    expect(new Set(GROUP.map((_p) => _p.expiresAt.getTime())).size).toBe(1);
    expect(GROUP[0]!.expiresAt.getTime() - Date.now()).toBeGreaterThan(60_000);

    const DELIVERIES = await PRISMA.notificationDelivery.findMany({ where: { event: { type: 'QUICK_MATCH_PROPOSAL' }, userId: { in: [...PLAYERS, ...INVITEES].map((_p) => _p.id) } }, select: { userId: true } });
    expect(DELIVERIES.map((_d) => _d.userId).sort()).toEqual([PLAYERS[0]!.id, PLAYERS[1]!.id, INVITEES[0]!.id].sort());
  });

  it('S3/S7: should mark only the accepting member confirmed and expose the honest acceptedCount', async () => {
    const { players: PLAYERS, groupKey: GROUP_KEY } = await formGroupSV('rc-s3');
    const ACCEPT = await confirm(PLAYERS[0]!);
    expect(ACCEPT.status).toBe(200);
    expect(ACCEPT.body.data).toMatchObject({ status: 'CONFIRMED', acceptedCount: 1, proposal: { status: 'CONFIRMED', matchId: null } });

    const OTHER = await get(PLAYERS[1]!);
    expect(OTHER.body.data).toMatchObject({ status: 'PROPOSAL', acceptedCount: 1, proposal: { status: 'PENDING' } });
    const STATUSES = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY }, select: { status: true } });
    expect(STATUSES.filter((_p) => _p.status === 'CONFIRMED')).toHaveLength(1);
    expect(await PRISMA.match.count({ where: { participants: { some: { userId: PLAYERS[0]!.id } } } })).toBe(0);
  });

  it('S4: should create the match and book the first free venue option when the 4th member accepts with an empty body', async () => {
    const VENUE = await PRISMA.venue.create({ data: { name: 'RC venue A', pricingCurrency: 'USD' } });
    const COURT = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'RC court A', pricePerHourCents: 4000 } });
    const { players: PLAYERS, groupKey: GROUP_KEY } = await formGroupSV('rc-s4a', '2026-12-02');
    for (const PLAYER of PLAYERS.slice(0, 3)) expect((await confirm(PLAYER)).status).toBe(200);
    const LAST = await confirm(PLAYERS[3]!);
    expect(LAST.status).toBe(200);
    expect(LAST.body.data).toMatchObject({ status: 'CONFIRMED', acceptedCount: 4 });
    const MATCH_ID = LAST.body.data.proposal.matchId as string;
    expect(MATCH_ID).toBeTruthy();

    const MATCH = await PRISMA.match.findUniqueOrThrow({ where: { id: MATCH_ID }, include: { participants: true, reservation: true } });
    expect(MATCH.participants.map((_p) => _p.userId).sort()).toEqual(PLAYERS.map((_p) => _p.id).sort());
    expect(MATCH.courtId).toBe(COURT.id);
    expect(MATCH.reservation).toMatchObject({ venueId: VENUE.id, courtId: COURT.id, status: 'CONFIRMED' });
    const GROUP = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY }, include: { search: true } });
    expect(GROUP.every((_p) => _p.matchId === MATCH_ID && _p.status === 'CONFIRMED' && _p.search.status === 'CONFIRMED')).toBe(true);
    await PRISMA.court.update({ where: { id: COURT.id }, data: { status: 'INACTIVE' } });
  });

  it('S4: should skip a venue option that was booked meanwhile and take the next free one', async () => {
    const VENUE = await PRISMA.venue.create({ data: { name: 'RC venue B', pricingCurrency: 'USD' } });
    const COURT_1 = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'RC court B1', pricePerHourCents: 4000 } });
    const COURT_2 = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'RC court B2', pricePerHourCents: 4000 } });
    const { categoryId: CATEGORY_ID, players: PLAYERS, groupKey: GROUP_KEY } = await formGroupSV('rc-s4b', '2026-12-03');
    const OPTIONS = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { groupKey: GROUP_KEY } })).venueOptions as Array<{ courtId: string; scheduledAt: string }>;
    expect(OPTIONS[0]!.courtId).toBe(COURT_1.id);
    await PRISMA.match.create({ data: { sportId, categoryId: CATEGORY_ID, organizerUserId: PLAYERS[0]!.id, type: 'REGULAR', status: 'SCHEDULED', scheduledAt: new Date(OPTIONS[0]!.scheduledAt), courtId: COURT_1.id, maxParticipants: 4 } });

    for (const PLAYER of PLAYERS.slice(0, 3)) expect((await confirm(PLAYER)).status).toBe(200);
    const LAST = await confirm(PLAYERS[3]!);
    expect(LAST.status).toBe(200);
    const MATCH = await PRISMA.match.findUniqueOrThrow({ where: { id: LAST.body.data.proposal.matchId }, include: { reservation: true } });
    expect(MATCH.courtId).toBe(COURT_2.id);
    expect(MATCH.reservation).toMatchObject({ courtId: COURT_2.id, status: 'CONFIRMED' });
    await PRISMA.court.updateMany({ where: { id: { in: [COURT_1.id, COURT_2.id] } }, data: { status: 'INACTIVE' } });
  });

  it('S4: should create the match without a court when no venue option is free', async () => {
    const { players: PLAYERS } = await formGroupSV('rc-s4c', '2026-12-04');
    for (const PLAYER of PLAYERS.slice(0, 3)) expect((await confirm(PLAYER)).status).toBe(200);
    const LAST = await confirm(PLAYERS[3]!);
    expect(LAST.status).toBe(200);
    const MATCH = await PRISMA.match.findUniqueOrThrow({ where: { id: LAST.body.data.proposal.matchId }, include: { participants: true, reservation: true } });
    expect(MATCH.participants).toHaveLength(4);
    expect(MATCH.courtId).toBeNull();
    expect(MATCH.scheduledAt).toBeNull();
    expect(MATCH.reservation).toBeNull();
  });

  it('S5/S6: should take the decliner out of the queue and return the others to searching keeping their queue position', async () => {
    const { players: PLAYERS, groupKey: GROUP_KEY } = await formGroupSV('rc-s5a', '2026-12-05');
    const QUEUED_BEFORE = await Promise.all(PLAYERS.map(async (_p) => (await searchOf(_p)).queuedAt.getTime()));
    expect((await confirm(PLAYERS[0]!)).status).toBe(200);

    const DECLINE = await dismiss(PLAYERS[1]!);
    expect(DECLINE.status).toBe(200);
    expect(DECLINE.body.data).toMatchObject({ status: 'CANCELLED', acceptedCount: 0, proposal: { status: 'DISMISSED' } });

    for (const INDEX of [0, 2, 3]) {
      const SEARCH = await searchOf(PLAYERS[INDEX]!);
      expect(SEARCH.status).toBe('SEARCHING');
      expect(SEARCH.proposal).toBeNull();
      expect(SEARCH.queuedAt.getTime()).toBe(QUEUED_BEFORE[INDEX]);
    }
    expect(await PRISMA.quickMatchProposal.count({ where: { groupKey: GROUP_KEY, status: { in: ['PENDING', 'CONFIRMED'] } } })).toBe(0);
  });

  it('S5: should expire the whole group on timeout, requeue who accepted and drop who did not accept', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s5b', 3, 1, '2026-12-07');
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, '2026-12-07')).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[0]!)).proposal!.groupKey!;
    const QUEUED_0 = (await searchOf(PLAYERS[0]!)).queuedAt.getTime();
    expect((await confirm(PLAYERS[0]!)).status).toBe(200);
    expect((await confirm(PLAYERS[1]!)).status).toBe(200);
    await PRISMA.quickMatchProposal.updateMany({ where: { groupKey: GROUP_KEY }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    //? Lo lee un miembro que ya había aceptado: igual se resuelve todo el grupo.
    const READ = await get(PLAYERS[0]!);
    expect(READ.status).toBe(200);
    expect(READ.body.data).toMatchObject({ status: 'SEARCHING', proposal: null, acceptedCount: 0 });

    expect((await searchOf(PLAYERS[0]!)).queuedAt.getTime()).toBe(QUEUED_0);
    expect((await searchOf(PLAYERS[1]!)).status).toBe('SEARCHING');
    expect((await searchOf(PLAYERS[2]!))).toMatchObject({ status: 'EXPIRED', proposal: { status: 'EXPIRED' } });
    expect((await searchOf(INVITEES[0]!))).toMatchObject({ status: 'EXPIRED', proposal: { status: 'EXPIRED' } });
  });

  it('S5: should leave an availability invitee who declined out of the queue', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s5c', 3, 1, '2026-12-08');
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, '2026-12-08')).status).toBe(201);
    expect((await dismiss(INVITEES[0]!)).status).toBe(200);
    expect((await searchOf(INVITEES[0]!)).status).toBe('CANCELLED');
    //? No vuelve a ser invitado apenas otro jugador busca de nuevo.
    for (const PLAYER of PLAYERS) await get(PLAYER);
    expect((await searchOf(INVITEES[0]!)).status).toBe('CANCELLED');
  });

  //? Decisión 2 (coordinador): al disolverse el ready check solo vuelven a la cola
  //? quienes buscaron de verdad o ya aceptaron; el invitado por disponibilidad
  //? que no aceptó sale de la cola.
  it('S5: should drop a pending availability invitee and requeue real searchers when another member declines', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s5d', 3, 1, '2026-12-14');
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, '2026-12-14')).status).toBe(201);
    const QUEUED_2 = (await searchOf(PLAYERS[2]!)).queuedAt.getTime();
    expect((await confirm(PLAYERS[0]!)).status).toBe(200);

    expect((await dismiss(PLAYERS[1]!)).status).toBe(200);

    expect(await searchOf(PLAYERS[0]!)).toMatchObject({ status: 'SEARCHING', proposal: null });
    const PENDING_SEARCHER = await searchOf(PLAYERS[2]!);
    expect(PENDING_SEARCHER).toMatchObject({ status: 'SEARCHING', proposal: null });
    expect(PENDING_SEARCHER.queuedAt.getTime()).toBe(QUEUED_2);
    expect((await searchOf(INVITEES[0]!)).status).toBe('CANCELLED');
    //? Tampoco vuelve a ser invitado ese día cuando los que siguen en cola leen su búsqueda.
    for (const INDEX of [0, 2]) await get(PLAYERS[INDEX]!);
    expect((await searchOf(INVITEES[0]!)).status).toBe('CANCELLED');
  });

  it('S5: should expire a pending availability invitee and requeue an invitee who accepted on timeout', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS, invitees: INVITEES } = await setupSV('rc-s5e', 2, 2, '2026-12-15');
    for (const PLAYER of PLAYERS) expect((await start(PLAYER, CATEGORY_ID, '2026-12-15')).status).toBe(201);
    const GROUP_KEY = (await searchOf(PLAYERS[1]!)).proposal!.groupKey!;
    expect((await confirm(INVITEES[0]!)).status).toBe(200);
    await PRISMA.quickMatchProposal.updateMany({ where: { groupKey: GROUP_KEY }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    expect((await get(PLAYERS[0]!)).status).toBe(200);

    expect(await searchOf(INVITEES[0]!)).toMatchObject({ status: 'SEARCHING', proposal: null });
    expect(await searchOf(INVITEES[1]!)).toMatchObject({ status: 'EXPIRED', proposal: { status: 'EXPIRED' } });
    expect((await searchOf(PLAYERS[1]!)).status).toBe('EXPIRED');
  });

  it('S6: should match the oldest searchers in the queue first', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('rc-s6', 5, 0, '2026-12-09');
    const BASE = Date.now() - 60 * 60_000;
    //? Se escriben en orden inverso a la cola, así `updatedAt` no coincide con la prioridad.
    for (const INDEX of [3, 2, 1, 0]) {
      await PRISMA.quickMatchSearch.create({ data: { userId: PLAYERS[INDEX]!.id, sportId, categoryId: CATEGORY_ID, targetDate: new Date('2026-12-09T00:00:00.000Z'), slots: ['EVENING'], includeOpenMatches: false, status: 'SEARCHING', noMatchYet: true, queuedAt: new Date(BASE + INDEX * 60_000) } });
    }
    const TRIGGER = await start(PLAYERS[4]!, CATEGORY_ID, '2026-12-09');
    expect(TRIGGER.body.data.status).toBe('PROPOSAL');
    expect([...TRIGGER.body.data.proposal.playerIds].sort()).toEqual([PLAYERS[0]!.id, PLAYERS[1]!.id, PLAYERS[2]!.id, PLAYERS[4]!.id].sort());
    expect((await searchOf(PLAYERS[3]!)).status).toBe('SEARCHING');
  });

  it('S8: should keep the single-player accept and dismiss flow for open matches', async () => {
    const { categoryId: CATEGORY_ID, players: PLAYERS } = await setupSV('rc-s8', 3, 0, '2026-12-10');
    const OPEN = await PRISMA.match.create({ data: { sportId, categoryId: CATEGORY_ID, organizerUserId: PLAYERS[0]!.id, type: 'REGULAR', status: 'SCHEDULED', scheduledAt: new Date('2026-12-10T22:00:00.000Z'), maxParticipants: 4, participants: { create: [{ userId: PLAYERS[0]!.id }] } } });

    const OFFER = await start(PLAYERS[1]!, CATEGORY_ID, '2026-12-10', true);
    expect(OFFER.body.data).toMatchObject({ status: 'PROPOSAL', acceptedCount: 0, proposal: { type: 'OPEN_MATCH', matchId: OPEN.id } });
    const ACCEPT = await confirm(PLAYERS[1]!);
    expect(ACCEPT.status).toBe(200);
    expect(ACCEPT.body.data).toMatchObject({ status: 'CONFIRMED', acceptedCount: 0 });
    expect(await PRISMA.matchParticipant.count({ where: { matchId: OPEN.id } })).toBe(2);

    const SECOND = await start(PLAYERS[2]!, CATEGORY_ID, '2026-12-10', true);
    expect(SECOND.body.data.proposal.type).toBe('OPEN_MATCH');
    const DISMISSED = await dismiss(PLAYERS[2]!);
    expect(DISMISSED.status).toBe(200);
    expect(DISMISSED.body.data.status).toBe('SEARCHING');
    expect(DISMISSED.body.data.dismissedMatchIds).toContain(OPEN.id);
  });
});
