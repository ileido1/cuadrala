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
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match ready check — concurrency and refill probes (HTTP + DB)', () => {
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
  const del = (_player: Player) => request(APP).delete('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`);
  const snapshotSV = async (_categoryId: string) => JSON.stringify({
    s: await PRISMA.quickMatchSearch.findMany({ where: { categoryId: _categoryId }, orderBy: { id: 'asc' }, select: { id: true, status: true, noMatchYet: true, queuedAt: true, dismissedMatchIds: true } }),
    p: await PRISMA.quickMatchProposal.findMany({ where: { search: { categoryId: _categoryId } }, orderBy: { id: 'asc' }, select: { id: true, status: true, groupKey: true, playerIds: true, matchId: true, expiresAt: true } }),
    m: await PRISMA.match.count({ where: { categoryId: _categoryId } }),
  });
  const seedSearching = (_p: Player, _categoryId: string, _date: string, _ago = 0) => PRISMA.quickMatchSearch.create({ data: { userId: _p.id, sportId, categoryId: _categoryId, targetDate: new Date(`${_date}T00:00:00.000Z`), slots: ['EVENING'], includeOpenMatches: false, status: 'SEARCHING', queuedAt: new Date(Date.now() - _ago) } });

  async function invariantsSV(_categoryId: string) {
    const PROPS = await PRISMA.quickMatchProposal.findMany({ where: { search: { categoryId: _categoryId }, type: 'NEW_GROUP', status: { in: ['PENDING', 'CONFIRMED'] } }, include: { search: true } });
    const BY_GROUP = new Map<string, number>();
    for (const P of PROPS) BY_GROUP.set(P.groupKey!, (BY_GROUP.get(P.groupKey!) ?? 0) + 1);
    for (const [, N] of BY_GROUP) expect(N).toBeLessThanOrEqual(4);
    for (const P of PROPS) {
      if (P.matchId === null) expect(['PROPOSAL', 'CONFIRMED']).toContain(P.search.status);
      if (P.status === 'CONFIRMED') expect(P.search.status).toBe('CONFIRMED');
      if (P.status === 'PENDING') expect(P.search.status).toBe('PROPOSAL');
    }
    const MATCHES = await PRISMA.match.findMany({ where: { categoryId: _categoryId }, include: { participants: true } });
    const SEEN = new Set<string>();
    for (const M of MATCHES) { expect(M.participants).toHaveLength(4); for (const X of M.participants) { expect(SEEN.has(X.userId!)).toBe(false); SEEN.add(X.userId!); } }
    return { groups: BY_GROUP, matches: MATCHES.length };
  }

  it('P1 rejected commands leave data unchanged', async () => {
    const { categoryId: C, players: P } = await setupSV('pz-rej', 5);
    expect((await start(P[4]!, C)).status).toBe(201);
    let before = await snapshotSV(C);
    expect((await confirm(P[4]!)).status).toBe(409);
    expect((await dismiss(P[4]!)).status).toBe(409);
    expect(await snapshotSV(C)).toBe(before);
    // no search at all
    const { players: Q } = await setupSV('pz-rej2', 1);
    expect((await confirm(Q[0]!)).status).toBe(409);
    expect((await dismiss(Q[0]!)).status).toBe(409);
    expect(await PRISMA.quickMatchSearch.count({ where: { userId: Q[0]!.id } })).toBe(0);
    // double confirm
    const { categoryId: C2, players: P2 } = await formGroupSV('pz-dbl');
    expect((await confirm(P2[0]!)).status).toBe(200);
    before = await snapshotSV(C2);
    const AGAIN = await confirm(P2[0]!);
    expect(AGAIN.status).toBe(409);
    expect(await snapshotSV(C2)).toBe(before);
    expect((await dismiss(P2[0]!)).status).toBe(200); // accepted member may still decline (leaves)
    expect((await dismiss(P2[0]!)).status).toBe(409);
  });

  it('P2 invalid explicit venue → 409 full rollback; valid explicit venue booked', async () => {
    const VENUE = await PRISMA.venue.create({ data: { name: 'PZ venue', pricingCurrency: 'USD' } });
    const COURT1 = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'PZ c1', pricePerHourCents: 4000 } });
    const COURT2 = await PRISMA.court.create({ data: { venueId: VENUE.id, name: 'PZ c2', pricePerHourCents: 4000 } });
    try {
      const { categoryId: C, players: P, groupKey: G } = await formGroupSV('pz-venue', '2026-12-02');
      const OPTS = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { groupKey: G } })).venueOptions as Array<{ venueId: string; courtId: string; scheduledAt: string }>;
      const SECOND = OPTS.find((o) => o.courtId === COURT2.id)!;
      expect(SECOND).toBeTruthy();
      for (const X of P.slice(0, 3)) expect((await confirm(X)).status).toBe(200);
      const before = await snapshotSV(C);
      const BAD = await confirm(P[3]!, { venueId: VENUE.id, courtId: COURT2.id, scheduledAt: '2026-12-02T08:00:00.000Z' });
      expect(BAD.status).toBe(409);
      expect(await snapshotSV(C)).toBe(before);
      expect(await PRISMA.reservation.count({ where: { courtId: { in: [COURT1.id, COURT2.id] } } })).toBe(0);
      const OK = await confirm(P[3]!, { venueId: SECOND.venueId, courtId: SECOND.courtId, scheduledAt: SECOND.scheduledAt });
      expect(OK.status).toBe(200);
      const M = await PRISMA.match.findUniqueOrThrow({ where: { id: OK.body.data.proposal.matchId }, include: { reservation: true } });
      expect(M.courtId).toBe(COURT2.id);
    } finally {
      await PRISMA.court.updateMany({ where: { id: { in: [COURT1.id, COURT2.id] } }, data: { status: 'INACTIVE' } });
    }
  });

  it('P3 DELETE during ready check → leaver CANCELLED, refill on next member GET; acceptedCount 0 for leaver; queuedAt kept', async () => {
    const D = '2026-12-03';
    const { categoryId: C, players: P } = await setupSV('pz-del', 5, 0, D);
    for (const X of P.slice(0, 4)) await start(X, C, D);
    const G = (await searchOf(P[0]!)).proposal!.groupKey!;
    const Q0 = (await searchOf(P[0]!)).queuedAt.getTime();
    expect((await confirm(P[0]!)).status).toBe(200);
    await seedSearching(P[4]!, C, D);
    expect((await del(P[1]!)).status).toBeLessThan(300);
    const LEFT = await searchOf(P[1]!);
    expect(LEFT).toMatchObject({ status: 'CANCELLED', proposal: { status: 'DISMISSED' } });
    expect((await get(P[1]!)).body.data?.acceptedCount ?? 0).toBe(0);
    const AFTER = await get(P[2]!);
    expect(AFTER.body.data.proposal.playerIds).toHaveLength(4);
    expect(AFTER.body.data.proposal.playerIds).toContain(P[4]!.id);
    expect(await searchOf(P[4]!)).toMatchObject({ status: 'PROPOSAL', proposal: { status: 'PENDING', groupKey: G } });
    expect((await searchOf(P[0]!))).toMatchObject({ status: 'CONFIRMED', proposal: { status: 'CONFIRMED' } });
    expect((await searchOf(P[0]!)).queuedAt.getTime()).toBe(Q0);
    await invariantsSV(C);
  });

  it('P4 timeout with no replacement: playerIds shrink; later searcher fills group before new group', async () => {
    const D = '2026-12-04';
    const { categoryId: C, players: P } = await setupSV('pz-wait', 8, 0, D);
    for (const X of P.slice(0, 4)) await start(X, C, D);
    const G = (await searchOf(P[0]!)).proposal!.groupKey!;
    await confirm(P[0]!); await confirm(P[1]!);
    await PRISMA.quickMatchProposal.updateMany({ where: { groupKey: G, status: 'PENDING' }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const R = await get(P[0]!);
    expect(R.body.data).toMatchObject({ status: 'CONFIRMED', acceptedCount: 2 });
    expect(R.body.data.proposal.playerIds).toHaveLength(2);
    expect(await searchOf(P[2]!)).toMatchObject({ status: 'EXPIRED', proposal: { status: 'EXPIRED' } });
    expect((await get(P[2]!)).body.data.acceptedCount).toBe(0);
    // 4 new searchers: first two fill G, next two wait (no new group with only 2)
    const A = await start(P[4]!, C, D);
    expect(A.body.data.proposal?.groupKey).toBe(G);
    const B = await start(P[5]!, C, D);
    expect(B.body.data.proposal?.groupKey).toBe(G);
    const C1 = await start(P[6]!, C, D);
    expect(C1.body.data).toMatchObject({ status: 'SEARCHING', proposal: null });
    await confirm(P[4]!);
    const LAST = await confirm(P[5]!);
    expect(LAST.body.data.acceptedCount).toBe(4);
    expect(LAST.body.data.proposal.matchId).not.toBeNull();
    await invariantsSV(C);
  });

  it('P5 stress: concurrent declines, polls, confirms and new searchers never break invariants or 500', async () => {
    for (let ROUND = 0; ROUND < 5; ROUND++) {
      const D = `2026-12-${String(10 + ROUND).padStart(2, '0')}`;
      const { categoryId: C, players: P } = await setupSV(`pz-st${ROUND}`, 12, 2, D);
      for (const X of P.slice(0, 4)) await start(X, C, D);
      await confirm(P[0]!);
      const CALLS = [
        dismiss(P[1]!), del(P[2]!), confirm(P[3]!),
        ...P.slice(4, 10).map((x) => start(x, C, D)),
        ...P.slice(0, 4).map((x) => get(x)), ...P.slice(4, 10).map((x) => get(x)),
      ];
      const RES = await Promise.all(CALLS);
      for (const r of RES) expect([200, 201, 204, 409]).toContain(r.status);
      // second wave: everyone polls & confirms concurrently
      const W2 = await Promise.all([...P.slice(0, 10).map((x) => get(x)), ...P.slice(3, 10).map((x) => confirm(x)), start(P[10]!, C, D), start(P[11]!, C, D)]);
      for (const r of W2) expect([200, 201, 409]).toContain(r.status);
      const W3 = await Promise.all([...P.map((x) => get(x)), ...P.map((x) => confirm(x))]);
      for (const r of W3) expect([200, 201, 409]).toContain(r.status);
      await invariantsSV(C);
    }
  }, 120_000);

  it('P6 search re-start racing a refill keeps status and proposal consistent', async () => {
    for (let ROUND = 0; ROUND < 6; ROUND++) {
      const D = `2026-12-${String(20 + ROUND).padStart(2, '0')}`;
      const { categoryId: C, players: P } = await setupSV(`pz-race${ROUND}`, 5, 0, D);
      for (const X of P.slice(0, 4)) await start(X, C, D);
      await seedSearching(P[4]!, C, D, 1000);
      await PRISMA.quickMatchProposal.updateMany({ where: { search: { userId: P[1]!.id } }, data: { status: 'DISMISSED' } });
      await PRISMA.quickMatchSearch.update({ where: { userId: P[1]!.id }, data: { status: 'CANCELLED' } });
      const RES = await Promise.all([get(P[0]!), start(P[4]!, C, D), get(P[2]!), start(P[4]!, C, D)]);
      for (const r of RES) expect(r.status).toBeLessThan(300);
      await invariantsSV(C);
      const S4 = await searchOf(P[4]!);
      const ACTIVE = S4.proposal !== null && ['PENDING', 'CONFIRMED'].includes(S4.proposal.status);
      expect(ACTIVE ? 'PROPOSAL' : 'SEARCHING').toBe(S4.status);
    }
  }, 60_000);

  it('P7 concurrent last-two confirms + polls (and a racing decline) → at most one match, never 500', async () => {
    for (let ROUND = 0; ROUND < 8; ROUND++) {
      const D = `2027-01-${String(1 + ROUND).padStart(2, '0')}`;
      const { categoryId: C, players: P } = await formGroupSV(`pz-last${ROUND}`, D);
      await confirm(P[0]!); await confirm(P[1]!);
      const EXTRA = ROUND % 2 === 0 ? [dismiss(P[3]!)] : [];
      const RES = await Promise.all([confirm(P[2]!), confirm(P[3]!), ...P.map((x) => get(x)), ...P.map((x) => get(x)), ...EXTRA]);
      for (const r of RES) expect([200, 409]).toContain(r.status);
      const { matches } = await invariantsSV(C);
      if (ROUND % 2 === 1) expect(matches).toBe(1);
      expect(matches).toBeLessThanOrEqual(1);
    }
  }, 60_000);

  it('P8 refill newcomers (searcher + availability) get a QUICK_MATCH_PROPOSAL delivery', async () => {
    const D = '2027-02-01';
    const { categoryId: C, players: P, invitees: I } = await setupSV('pz-notif', 2, 3, D);
    const FIRST = await start(P[0]!, C, D);
    const G = FIRST.body.data.proposal.groupKey;
    expect(FIRST.body.data.proposal.playerIds).toHaveLength(4);
    await seedSearching(P[1]!, C, D);
    expect((await dismiss(I[0]!)).status).toBe(200);
    expect((await searchOf(P[1]!)).proposal?.groupKey).toBe(G);
    // extra availability user, then another decline -> invitee refill
    const U = await PRISMA.user.create({ data: { email: `pz-x-${Date.now()}@test.local`, name: 'pz x' } });
    await PRISMA.userCategory.create({ data: { userId: U.id, categoryId: C } });
    await PRISMA.userSportCategory.create({ data: { userId: U.id, sportId, categoryId: C } });
    await PRISMA.userAvailability.create({ data: { userId: U.id, dayOfWeek: 'MONDAY' as never, slot: 'EVENING' } });
    expect((await dismiss(I[1]!)).status).toBe(200);
    expect(await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: U.id }, include: { proposal: true } })).toMatchObject({ status: 'PROPOSAL', proposal: { groupKey: G, status: 'PENDING' } });
    const DEL = await PRISMA.notificationDelivery.findMany({ where: { event: { type: 'QUICK_MATCH_PROPOSAL' }, userId: { in: [P[1]!.id, U.id] } }, select: { userId: true } });
    expect(DEL.map((d) => d.userId).sort()).toEqual([P[1]!.id, U.id].sort());
  });
});
