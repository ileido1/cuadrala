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

  it('#90: does not merge a new searcher into a group whose proposal already expired, even if its status was never swept', async () => {
    const [P0, P1, P2] = await createPlayersSV(3, 'qm90');
    const DATE = '2026-11-02';
    expect((await start(P0!, DATE)).status).toBe(201);
    const SECOND = await start(P1!, DATE);
    expect(SECOND.status).toBe(201);
    const GROUP_KEY = SECOND.body.data.proposal.groupKey as string;
    expect(GROUP_KEY).toBeDefined();

    //? Simula una propuesta vencida que todavía no fue "barrida" (nadie de ese
    //? grupo volvió a pedir GET /quick-match para disparar expireProposalForUserSV).
    await PRISMA.quickMatchProposal.updateMany({ where: { groupKey: GROUP_KEY }, data: { expiresAt: new Date(Date.now() - 60_000) } });

    const THIRD = await start(P2!, DATE);
    expect(THIRD.status).toBe(201);
    expect(THIRD.body.data.proposal.groupKey).not.toBe(GROUP_KEY);
  });

  it('#91: cancelling with a pending group proposal frees the slot instead of leaving it permanently occupied', async () => {
    const [P0, P1, P2, P3, P4] = await createPlayersSV(5, 'qm91');
    const DATE = '2026-11-03';
    for (const PLAYER of [P0!, P1!, P2!, P3!]) expect((await start(PLAYER, DATE)).status).toBe(201);
    const GROUP_KEY = (await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: P0!.id } }, select: { groupKey: true } })).groupKey!;

    expect((await cancel(P1!)).status).toBe(204);
    const AFTER_CANCEL = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: GROUP_KEY, status: 'PENDING' } });
    expect(AFTER_CANCEL).toHaveLength(3);
    expect(AFTER_CANCEL.every((_p) => _p.playerIds.length === 3)).toBe(true);

    const REFILL = await start(P4!, DATE);
    expect(REFILL.status).toBe(201);
    expect(REFILL.body.data.proposal.groupKey).toBe(GROUP_KEY);

    for (const PLAYER of [P0!, P2!, P3!, P4!]) expect((await confirm(PLAYER)).status).toBe(200);

    const MATCH = await PRISMA.match.findFirst({ where: { organizerUserId: P0!.id }, include: { participants: true } });
    expect(MATCH).not.toBeNull();
    expect(MATCH!.participants.map((_p) => _p.userId).sort()).toEqual([P0!.id, P2!.id, P3!.id, P4!.id].sort());
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

  it('#93: an existing pending group member is notified when a new player joins their group', async () => {
    const [P0, P1] = await createPlayersSV(2, 'qm93');
    const DATE = '2026-11-05';
    expect((await start(P0!, DATE)).status).toBe(201);

    const BEFORE = await PRISMA.notificationDelivery.count({ where: { userId: P0!.id, event: { type: 'QUICK_MATCH_PROPOSAL' } } });

    const SECOND = await start(P1!, DATE);
    expect(SECOND.status).toBe(201);
    expect(SECOND.body.data.proposal.groupKey).toBeDefined();

    const AFTER = await PRISMA.notificationDelivery.count({ where: { userId: P0!.id, event: { type: 'QUICK_MATCH_PROPOSAL' } } });
    expect(AFTER).toBeGreaterThan(BEFORE);
  });
});
