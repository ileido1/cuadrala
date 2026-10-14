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

describe.skipIf(!HAS_INTEGRATION_DATABASE)('Quick Match group departure', () => {
  let sportId: string; let categoryId: string; let venueId: string; let courtId: string; let players: Player[];
  const date = '2026-10-20';
  beforeAll(async () => {
    await resetDatabaseForTestsSV();
    sportId = (await ensureTestCatalogSV()).sportPadelId;
    categoryId = (await createTestCategorySV(sportId, `qm7-${Date.now()}`, 'QM7')).id;
    await PRISMA.feeRule.create({ data: { scope: 'MATCH', type: 'FIXED', value: new Prisma.Decimal(0), isActive: true } });
    const venue = await PRISMA.venue.create({ data: { name: 'QM7 venue', pricingCurrency: 'USD' } }); venueId = venue.id;
    courtId = (await PRISMA.court.create({ data: { venueId, name: 'QM7 court', pricePerHourCents: 4000 } })).id;
    players = await Promise.all([...Array(6)].map(async (_, index) => { const email = `qm7-${Date.now()}-${index}@test.local`; const user = await PRISMA.user.create({ data: { email, name: `QM7 ${index}` } }); await PRISMA.userCategory.create({ data: { userId: user.id, categoryId } }); return { id: user.id, token: signAccessTokenSV(user.id, email) }; }));
  });
  afterAll(async () => { await PRISMA.$disconnect(); });
  const start = (player: Player, slots = ['EVENING']) => request(APP).post('/api/v1/quick-match').set('Authorization', `Bearer ${player.token}`).send({ sportId, categoryId, day: 'CUSTOM', date, slots, widenLevel: false, zoneKm: 10, includeOpenMatches: false });
  it('keeps a three-player group pending, excludes extra and mismatched candidates, replaces the departed seat, and finalizes locally', async () => {
    for (const player of players.slice(0, 4)) expect((await start(player)).status).toBe(201);
    expect((await start(players[5]!, ['MORNING'])).status).toBe(201);
    const initial = await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: players[0]!.id } }, select: { groupKey: true } });
    const initialDeliveries = await PRISMA.notificationDelivery.count({ where: { event: { type: 'QUICK_MATCH_PROPOSAL' } } });
    expect(initialDeliveries).toBeGreaterThanOrEqual(0);
    const leave = await request(APP).post('/api/v1/quick-match/proposal/dismiss').set('Authorization', `Bearer ${players[1]!.token}`).send({}); expect(leave.status).toBe(200); expect(leave.body.data.proposal.status).toBe('DISMISSED');
    const activeAfterLeave = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: initial.groupKey, status: 'PENDING' } }); expect(activeAfterLeave).toHaveLength(3); expect(activeAfterLeave.every((p) => p.playerIds.length === 3)).toBe(true);
    const refill = await start(players[4]!); expect(refill.status).toBe(201); expect(refill.body.data.proposal.groupKey).toBe(initial.groupKey);
    const active = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: initial.groupKey, status: 'PENDING' }, include: { search: { select: { userId: true } } } }); expect(active).toHaveLength(4); expect(active.map((p) => p.search.userId)).not.toContain(players[5]!.id);
    for (const player of [players[0]!, players[2]!, players[3]!]) expect((await request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${player.token}`).send({})).status).toBe(200);
    const option = refill.body.data.proposal.venueOptions[0]; const done = await request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${players[4]!.token}`).send({ venueId: option.venueId, courtId: option.courtId, scheduledAt: option.scheduledAt }); expect(done.status).toBe(200);
    const match = await PRISMA.match.findUniqueOrThrow({ where: { id: done.body.data.proposal.matchId }, include: { participants: true, reservation: true } }); expect(match.participants).toHaveLength(4); expect(match.reservation).toMatchObject({ venueId, courtId, status: 'CONFIRMED' });
    const obligations = await request(APP).post(`/api/v1/matches/${match.id}/transactions/create-obligations`).send({ amountBasePerPerson: 10 }); expect(obligations.status).toBe(201); expect(obligations.body.data.created).toHaveLength(4);
  });
});
