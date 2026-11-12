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
  //? Ready check (S5, L7): el que rechaza sale de la cola, el grupo sigue y el
  //? siguiente buscador compatible ocupa su cupo; el último confirma con una sede
  //? explícita (body opcional, compatibilidad hacia atrás) y el partido queda listo para cobrar.
  it('replaces only the decliner with the next searcher, and finalizes with an explicit venue selection', async () => {
    for (const player of players.slice(0, 4)) expect((await start(player)).status).toBe(201);
    expect((await start(players[5]!, ['MORNING'])).status).toBe(201);
    const initial = await PRISMA.quickMatchProposal.findFirstOrThrow({ where: { search: { userId: players[0]!.id } }, select: { groupKey: true } });
    const leave = await request(APP).post('/api/v1/quick-match/proposal/dismiss').set('Authorization', `Bearer ${players[1]!.token}`).send({}); expect(leave.status).toBe(200); expect(leave.body.data).toMatchObject({ status: 'CANCELLED', proposal: { status: 'DISMISSED' } });
    expect(await PRISMA.quickMatchProposal.count({ where: { groupKey: initial.groupKey, status: 'PENDING' } })).toBe(3);
    const refill = await start(players[4]!); expect(refill.status).toBe(201); expect(refill.body.data.proposal.groupKey).toBe(initial.groupKey);
    const active = await PRISMA.quickMatchProposal.findMany({ where: { groupKey: refill.body.data.proposal.groupKey, status: 'PENDING' }, include: { search: { select: { userId: true } } } }); expect(active).toHaveLength(4); expect(active.map((p) => p.search.userId)).not.toContain(players[5]!.id); expect(active.map((p) => p.search.userId)).not.toContain(players[1]!.id);
    for (const player of [players[0]!, players[2]!, players[3]!]) expect((await request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${player.token}`).send({})).status).toBe(200);
    const option = refill.body.data.proposal.venueOptions[0]; const done = await request(APP).post('/api/v1/quick-match/proposal/confirm').set('Authorization', `Bearer ${players[4]!.token}`).send({ venueId: option.venueId, courtId: option.courtId, scheduledAt: option.scheduledAt }); expect(done.status).toBe(200); expect(done.body.data.acceptedCount).toBe(4);
    const match = await PRISMA.match.findUniqueOrThrow({ where: { id: done.body.data.proposal.matchId }, include: { participants: true, reservation: true } }); expect(match.participants).toHaveLength(4); expect(match.reservation).toMatchObject({ venueId, courtId, status: 'CONFIRMED' });
    //? players[0] es el organizerUserId del match (el más antiguo en la cola
    //? encabeza PLAYER_IDS) — necesita autorización de organizador/staff para
    //? generar la obligación de los 4 participantes de una sola vez (#49).
    const obligations = await request(APP).post(`/api/v1/matches/${match.id}/transactions/create-obligations`).set('Authorization', `Bearer ${players[0]!.token}`).send({ amountBasePerPerson: 10 }); expect(obligations.status).toBe(201); expect(obligations.body.data.created).toHaveLength(4);
  });
});
