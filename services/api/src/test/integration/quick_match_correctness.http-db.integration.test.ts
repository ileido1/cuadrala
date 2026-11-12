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

//? Issues #90-#93: 4 correctness gaps encontrados auditando Quick Match.
//? Mismo patrón HTTP+DB real que quick_match_group.http-db.integration.test.ts.
describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match correctness (HTTP + DB)', () => {
  let sportId: string;
  let categoryId: string;

  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    sportId = (await ensureTestCatalogSV()).sportPadelId;
    categoryId = (await createTestCategorySV(sportId, `qmcorr-${Date.now()}`, 'QMCORR')).id;
    await PRISMA.feeRule.create({ data: { scope: 'MATCH', type: 'FIXED', value: new Prisma.Decimal(0), isActive: true } });
  });

  afterAll(async () => {
    await PRISMA.$disconnect();
  });

  async function createPlayersSV(_count: number, _label: string): Promise<Player[]> {
    return Promise.all(
      [...Array(_count)].map(async (_unused, _index) => {
        const EMAIL = `${_label}-${Date.now()}-${_index}@test.local`;
        const USER = await PRISMA.user.create({ data: { email: EMAIL, name: `${_label} ${_index}` } });
        await PRISMA.userCategory.create({ data: { userId: USER.id, categoryId } });
        return { id: USER.id, token: signAccessTokenSV(USER.id, EMAIL) };
      }),
    );
  }

  function start(_player: Player, _date: string, _slots: string[] = ['EVENING']) {
    return request(APP)
      .post('/api/v1/quick-match')
      .set('Authorization', `Bearer ${_player.token}`)
      .send({ sportId, categoryId, day: 'CUSTOM', date: _date, slots: _slots, widenLevel: false, zoneKm: 10, includeOpenMatches: false });
  }

  function cancel(_player: Player) {
    return request(APP).delete('/api/v1/quick-match').set('Authorization', `Bearer ${_player.token}`);
  }

  function confirm(_player: Player, _body: Record<string, unknown> = {}) {
    return request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${_player.token}`).send(_body);
  }

  //? Ready check (S1/S5): un grupo vencido y todavía no "barrido" no vuelve a
  //? reclutar a nadie. Sus miembros no están en SEARCHING, y al leer uno de
  //? ellos se resuelve todo el grupo.
  it('#90: does not merge a new searcher into a group whose proposal already expired, even if its status was never swept', async () => {
    const [P0, P1, P2, P3, P4] = await createPlayersSV(5, 'qm90');
    const DATE = '2026-11-02';
    for (const PLAYER of [P0!, P1!, P2!, P3!]) expect((await start(PLAYER, DATE)).status).toBe(201);
    const GROUP_KEY = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: P0!.id } }, select: { groupKey: true } })).groupKey!;

    //? Simula una propuesta vencida que todavía no fue "barrida" (nadie de ese
    //? grupo volvió a pedir GET /quick-match para disparar expireProposalForUserSV).
    await PRISMA.quickMatchProposal.updateMany({ where: { groupKey: GROUP_KEY }, data: { expiresAt: new Date(Date.now() - 60_000) } });

    const FIFTH = await start(P4!, DATE);
    expect(FIFTH.status).toBe(201);
    expect(FIFTH.body.data).toMatchObject({ status: 'SEARCHING', noMatchYet: true, proposal: null });
    expect(await PRISMA.quickMatchProposal.count({ where: { groupKey: GROUP_KEY } })).toBe(4);
  });

  //? #91 con ready check (S5, L7): salir de la cola durante el ready check saca
  //? solo a ese jugador; el grupo sigue y el siguiente buscador ocupa el cupo.
  it('#91: cancelling with a pending group proposal frees the slot instead of leaving it permanently occupied', async () => {
    const [P0, P1, P2, P3, P4] = await createPlayersSV(5, 'qm91');
    const DATE = '2026-11-03';
    for (const PLAYER of [P0!, P1!, P2!, P3!]) expect((await start(PLAYER, DATE)).status).toBe(201);
    const GROUP_KEY = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: P0!.id } }, select: { groupKey: true } })).groupKey!;

    expect((await cancel(P1!)).status).toBe(204);
    expect((await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: P1!.id } })).status).toBe('CANCELLED');
    const AFTER_CANCEL = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY, status: 'PENDING' } });
    expect(AFTER_CANCEL).toHaveLength(3);
    expect(AFTER_CANCEL.every((_p) => _p.playerIds.length === 3 && !_p.playerIds.includes(P1!.id))).toBe(true);

    const REFILL = await start(P4!, DATE);
    expect(REFILL.status).toBe(201);
    expect(REFILL.body.data.proposal.groupKey).toBe(GROUP_KEY);
    expect([...REFILL.body.data.proposal.playerIds].sort()).toEqual([P0!.id, P2!.id, P3!.id, P4!.id].sort());

    for (const PLAYER of [P0!, P2!, P3!, P4!]) expect((await confirm(PLAYER)).status).toBe(200);

    const MATCH = await PRISMA.match.findFirst({ where: { organizerUserId: P0!.id }, include: { participants: true } });
    expect(MATCH).not.toBeNull();
    expect(MATCH!.participants.map((_p) => _p.userId).sort()).toEqual([P0!.id, P2!.id, P3!.id, P4!.id].sort());
  });

  //? "Salir de la cola" no hacía nada si la búsqueda ya no estaba en
  //? SEARCHING/PROPOSAL: el banner de inicio quedaba "activo" para siempre.
  it('should cancel a search whose proposal expired when the player leaves the queue', async () => {
    const [P0] = await createPlayersSV(1, 'qmexp');
    expect((await start(P0!, '2026-11-05')).status).toBe(201);
    await PRISMA.quickMatchSearch.update({ where: { userId: P0!.id }, data: { status: 'EXPIRED', noMatchYet: true } });

    expect((await cancel(P0!)).status).toBe(204);

    const SEARCH = await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: P0!.id } });
    expect(SEARCH.status).toBe('CANCELLED');
  });

  it('should cancel a confirmed search whose group has no match yet and free the slot', async () => {
    const [P0, P1, P2, P3] = await createPlayersSV(4, 'qmconf');
    const DATE = '2026-11-06';
    for (const PLAYER of [P0!, P1!, P2!, P3!]) expect((await start(PLAYER, DATE)).status).toBe(201);
    expect((await confirm(P0!)).status).toBe(200);
    const GROUP_KEY = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: P0!.id } }, select: { groupKey: true } })).groupKey!;

    expect((await cancel(P0!)).status).toBe(204);

    const SEARCH = await PRISMA.quickMatchSearch.findUniqueOrThrow({ where: { userId: P0!.id } });
    expect(SEARCH.status).toBe('CANCELLED');
    //? S5: los demás siguen en el grupo, PENDING, con un cupo libre a reponer.
    const REMAINING = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY, status: { in: ['PENDING', 'CONFIRMED'] } }, include: { search: { select: { userId: true, status: true } } } });
    expect(REMAINING.map((_p) => _p.search.userId).sort()).toEqual([P1!.id, P2!.id, P3!.id].sort());
    expect(REMAINING.every((_p) => _p.status === 'PENDING' && _p.search.status === 'PROPOSAL' && !_p.playerIds.includes(P0!.id))).toBe(true);
  });

  it('#92: confirming after a prior join already succeeded (partial failure retry) does not get stuck on YA_UNIDO', async () => {
    const [ORGANIZER, SEARCHER] = await createPlayersSV(2, 'qm92');
    const DATE = '2026-11-04';
    const SCHEDULED_AT = new Date(`${DATE}T22:00:00.000Z`);
    const OPEN_MATCH = await PRISMA.match.create({
      data: {
        sportId, categoryId, organizerUserId: ORGANIZER!.id, type: 'REGULAR', status: 'SCHEDULED',
        scheduledAt: SCHEDULED_AT, maxParticipants: 4,
        participants: { create: [{ userId: ORGANIZER!.id }] },
      },
    });

    const SEARCH_RES = await request(APP)
      .post('/api/v1/quick-match')
      .set('Authorization', `Bearer ${SEARCHER!.token}`)
      .send({ sportId, categoryId, day: 'CUSTOM', date: DATE, slots: ['EVENING'], widenLevel: false, zoneKm: 10, includeOpenMatches: true });
    expect(SEARCH_RES.status).toBe(201);
    expect(SEARCH_RES.body.data.proposal.type).toBe('OPEN_MATCH');
    expect(SEARCH_RES.body.data.proposal.matchId).toBe(OPEN_MATCH.id);

    //? Simula que un intento anterior de confirmar ya unió al usuario al partido
    //? (joinMatch exitoso) pero el proceso falló antes de confirmar la propuesta.
    await PRISMA.matchParticipant.create({ data: { matchId: OPEN_MATCH.id, userId: SEARCHER!.id } });

    const CONFIRM_RES = await confirm(SEARCHER!);
    expect(CONFIRM_RES.status).toBe(200);
    expect(CONFIRM_RES.body.data.status).toBe('CONFIRMED');
  });

  //? #93 con ready check: el grupo se arma completo de una vez y los buscadores
  //? que ya estaban en cola se enteran por notificación (S2).
  it('#93: an existing pending group member is notified when a new player joins their group', async () => {
    const [P0, P1, P2, P3] = await createPlayersSV(4, 'qm93');
    const DATE = '2026-11-05';
    for (const PLAYER of [P0!, P1!, P2!]) expect((await start(PLAYER, DATE)).status).toBe(201);

    const BEFORE = await PRISMA.notificationDelivery.count({ where: { userId: P0!.id, event: { type: 'QUICK_MATCH_PROPOSAL' } } });

    const FOURTH = await start(P3!, DATE);
    expect(FOURTH.status).toBe(201);
    expect(FOURTH.body.data.proposal.groupKey).toBeDefined();

    const AFTER = await PRISMA.notificationDelivery.count({ where: { userId: P0!.id, event: { type: 'QUICK_MATCH_PROPOSAL' } } });
    expect(AFTER).toBeGreaterThan(BEFORE);
  });
});
