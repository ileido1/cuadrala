import { afterEach, expect, it, vi } from 'vitest';
import { generateAmericanoScheduleSV } from '../../domain/americano/americano_schedule_generator.js';
import { generateRoundRobinScheduleSV } from '../../domain/round_robin/round_robin_schedule_generator.js';
import { generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import { generateGroupsPlusKnockoutScheduleSV } from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';
import { DefaultTournamentFormatParametersValidator } from '../../domain/services/tournament/tournament_format_parameters_validator.js';
import type { FormatParameterFieldSchema } from '../../domain/ports/tournament_format_parameters_validator.js';
import { collapsePairsToCompetitorsSV } from '../../domain/tournament/tournament_pairing.js';

const DATABASE = vi.hoisted(() => ({ tables: new Map<string, Array<Record<string, unknown>>>(), finished: 0 }));
vi.mock('dotenv/config', () => ({}));
vi.mock('pg', () => ({ Pool: class { end = async () => {}; } }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));
vi.mock('../../generated/prisma/client.js', async (_importOriginal) => {
  const ORIGINAL = await _importOriginal<typeof import('../../generated/prisma/client.js')>();
  const MATCHES = (_row: Record<string, unknown>, _where: Record<string, unknown>): boolean =>
    Object.entries(_where).every(([_key, _value]) => {
      if (_key === 'placeId' && typeof _value === 'object') {
        return (_value as { in: string[] }).in.includes(_row[_key] as string);
      }
      return typeof _value === 'object' && _value !== null && !(_value instanceof Date)
        ? MATCHES(_row, _value as Record<string, unknown>)
        : String(_row[_key]) === String(_value);
    });
  const CLIENT = new Proxy({}, {
    get: (_target, _model: string) => {
      if (_model === '$transaction') return async (_work: (_client: unknown) => Promise<unknown>) => _work(CLIENT);
      if (_model === '$disconnect') return async () => { DATABASE.finished++; };
      if (!DATABASE.tables.has(_model)) DATABASE.tables.set(_model, []);
      const ROWS = DATABASE.tables.get(_model)!;
      return {
        findUniqueOrThrow: async ({ where }: { where: Record<string, unknown> }) => {
          const ROW = ROWS.find((_r) => MATCHES(_r, where));
          if (!ROW) throw new Error(`Missing ${_model}`);
          return ROW;
        },
        findUnique: async ({ where }: { where: Record<string, unknown> }) => ROWS.find((_r) => MATCHES(_r, where)) ?? null,
        findFirst: async ({ where }: { where: Record<string, unknown> }) => ROWS.find((_r) => MATCHES(_r, where)) ?? null,
        findMany: async ({ where = {}, take }: { where?: Record<string, unknown>; take?: number }) => ROWS.filter((_r) => MATCHES(_r, where)).slice(0, take),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const ROW = { id: `${_model}-${ROWS.length}`, ...data };
          ROWS.push(ROW);
          return ROW;
        },
        upsert: async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
          const ROW = ROWS.find((_r) => MATCHES(_r, where));
          if (ROW) return Object.assign(ROW, update);
          const CREATED = { id: `${_model}-${ROWS.length}`, ...create };
          ROWS.push(CREATED);
          return CREATED;
        },
        update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => Object.assign(ROWS.find((_r) => MATCHES(_r, where))!, data),
      };
    },
  });
  return { ...ORIGINAL, PrismaClient: class { constructor() { return CLIENT; } } };
});

async function runSeedSV(): Promise<void> {
  const FINISHED = DATABASE.finished;
  vi.resetModules();
  const SEED_PATH = '../../../prisma/seed.js';
  await import(SEED_PATH);
  await vi.waitFor(() => expect(DATABASE.finished).toBe(FINISHED + 1));
}

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); DATABASE.tables.clear(); DATABASE.finished = 0; });

it('should create coherent isolated fixtures without duplicates when seeded twice', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  DATABASE.tables.set('venue', [{ id: 'real-venue', placeId: 'real:venue' }]);
  DATABASE.tables.set('user', [{ id: 'real-user', email: 'real@example.com', name: 'Preserve me' }]);
  await runSeedSV();
  const MATCH = DATABASE.tables.get('match')![0]!;
  const MANUAL_DATE = new Date('2030-01-01T15:00:00Z');
  Object.assign(MATCH, { status: 'FINISHED', scheduledAt: MANUAL_DATE });
  const RATE = DATABASE.tables.get('exchangeRate')![0]!;
  Object.assign(RATE, { source: 'live-provider', rateToBs: 999 });
  await runSeedSV();
  expect(RATE).toMatchObject({ source: 'live-provider', rateToBs: 999 });
  expect(MATCH.status).toBe('FINISHED');
  expect(MATCH.scheduledAt).toBe(MANUAL_DATE);
  const SPORTS = DATABASE.tables.get('sport')!;
  const TENNIS = SPORTS.find((_r) => _r.code === 'TENNIS')!;
  expect(DATABASE.tables.get('tournamentFormatPreset')).toContainEqual(expect.objectContaining({ sportId: TENNIS.id, version: 2 }));
  expect(DATABASE.tables.get('playerProfile')!.every((_r) => /^\+58412\d{7}$/.test(String(_r.phone)) && /^\d+$/.test(String(_r.documentNumber)))).toBe(true);
  expect(DATABASE.tables.get('venuePaymentMethod')!.some((_r) => _r.venueId === 'real-venue')).toBe(false);
  expect(DATABASE.tables.get('court')!.some((_r) => _r.sportType === 'TENNIS')).toBe(true);
  expect(DATABASE.tables.get('match')).toHaveLength(3);
  expect(DATABASE.tables.get('user')![0]).toEqual({ id: 'real-user', email: 'real@example.com', name: 'Preserve me' });
});

it('should seed all seven schedulable modalities and preserve QA progress when rerun', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await runSeedSV();
  const TOURNAMENTS = DATABASE.tables.get('tournament') ?? [];
  expect(TOURNAMENTS).toHaveLength(7);
  const REGISTRATIONS = DATABASE.tables.get('tournamentRegistration')!;
  const GENERATORS = { AMERICANO: generateAmericanoScheduleSV, ROUND_ROBIN: generateRoundRobinScheduleSV, SINGLE_ELIMINATION: generateSingleEliminationScheduleSV, GROUPS_PLUS_KNOCKOUT: generateGroupsPlusKnockoutScheduleSV };
  const MODALITIES = new Set<string>();
  for (const TOURNAMENT of TOURNAMENTS) {
    expect(TOURNAMENT).toMatchObject({ status: 'OPEN', visibility: 'PUBLIC' });
    const PRESET = DATABASE.tables.get('tournamentFormatPreset')!.find((_p) => _p.id === TOURNAMENT.formatPresetId)!;
    const SPORT = DATABASE.tables.get('sport')!.find((_s) => _s.id === TOURNAMENT.sportId)!;
    MODALITIES.add(`${PRESET.code}/${SPORT.code}/${TOURNAMENT.pairedRegistration}`);
    expect(DATABASE.tables.get('court')!.some((_c) => _c.venueId === TOURNAMENT.venueId && _c.sportType === SPORT.code)).toBe(true);
    const CONFIRMED = REGISTRATIONS.filter((_r) => _r.tournamentId === TOURNAMENT.id && _r.status === 'CONFIRMED');
    expect(CONFIRMED).toHaveLength(TOURNAMENT.pairedRegistration ? 8 : 4);
    const PAIR_INPUT = CONFIRMED.map((_r) => ({ id: String(_r.id), partnerRegistrationId: _r.partnerRegistrationId as string | null }));
    const IDS = TOURNAMENT.pairedRegistration ? collapsePairsToCompetitorsSV(PAIR_INPUT).competitorIds : PAIR_INPUT.map((_r) => _r.id);
    for (const REG of PAIR_INPUT) {
      if (TOURNAMENT.pairedRegistration) expect(PAIR_INPUT.find((_r) => _r.id === REG.partnerRegistrationId)?.partnerRegistrationId).toBe(REG.id);
    }
    expect(new DefaultTournamentFormatParametersValidator().validateAndNormalizeSV({
      parametersSchema: PRESET.parametersSchema as FormatParameterFieldSchema[],
      formatParameters: TOURNAMENT.formatParameters,
    })).toEqual(TOURNAMENT.formatParameters);
    const GENERATOR = GENERATORS[PRESET.code as keyof typeof GENERATORS];
    expect(GENERATOR({ participantRegistrationIds: IDS, ...(TOURNAMENT.formatParameters as object) }).rounds.length).toBeGreaterThan(0);
  }
  expect(MODALITIES.size).toBe(7);
  expect(DATABASE.tables.get('tournamentSchedule') ?? []).toHaveLength(0);
  expect(REGISTRATIONS.some((_r) => _r.registrationType === 'GUEST' && _r.userId === null && _r.registeredByUserId)).toBe(true);
  expect(REGISTRATIONS.some((_r) => _r.status === 'PENDING')).toBe(true);
  expect(DATABASE.tables.get('tournamentInvitation')).toHaveLength(1);
  TOURNAMENTS[0]!.status = 'IN_PROGRESS';
  TOURNAMENTS[0]!.startsAt = new Date('2030-01-01T16:00:00Z');
  REGISTRATIONS[0]!.status = 'WITHDRAWN';
  DATABASE.tables.get('tournamentInvitation')![0]!.status = 'ACCEPTED';
  const BEFORE = structuredClone(TOURNAMENTS);
  const REGISTRATIONS_BEFORE = structuredClone(REGISTRATIONS);
  await runSeedSV();
  expect(TOURNAMENTS).toHaveLength(7);
  expect(TOURNAMENTS[0]!.status).toBe('IN_PROGRESS');
  expect(REGISTRATIONS).toEqual(REGISTRATIONS_BEFORE);
  expect(DATABASE.tables.get('tournamentInvitation')![0]!.status).toBe('ACCEPTED');
  expect(REGISTRATIONS[0]!.status).toBe('WITHDRAWN');
  expect(TOURNAMENTS.map((_t) => _t.startsAt)).toEqual(BEFORE.map((_t) => _t.startsAt));
});

//? Pádel Center Chacao y Canchas del Sur quedaban sin owner: nadie podía
//? administrarlas (agenda, pagos, ajustes) desde la web de staff.
it('should give every seed venue its own owner with an OWNER staff role', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  DATABASE.tables.set('venue', [{ id: 'real-venue', placeId: 'real:venue' }]);
  await runSeedSV();
  const SEED_VENUES = DATABASE.tables.get('venue')!.filter((_v) => String(_v.placeId).startsWith('seed:venue:'));
  expect(SEED_VENUES).toHaveLength(3);
  const USERS = DATABASE.tables.get('user')!;
  const STAFF = DATABASE.tables.get('venueStaff')!;
  for (const VENUE of SEED_VENUES) {
    expect(VENUE.ownerUserId, String(VENUE.placeId)).toBeDefined();
    expect(USERS.some((_u) => _u.id === VENUE.ownerUserId)).toBe(true);
    expect(STAFF).toContainEqual(expect.objectContaining({ venueId: VENUE.id, userId: VENUE.ownerUserId, role: 'OWNER' }));
  }
  expect(new Set(SEED_VENUES.map((_v) => _v.ownerUserId)).size).toBe(3);
  expect(DATABASE.tables.get('venue')!.find((_v) => _v.id === 'real-venue')!.ownerUserId).toBeUndefined();
});

//? El resultado del partido terminado tenía un formato que la API no lee
//? (`DraftPayload` = scores/teams/sets{teamA,teamB}); el MatchResult quedaba
//? sin payload aunque la API siempre lo guarda al finalizar.
it('should seed the finished match result in the shape the API reads', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await runSeedSV();
  const DRAFT = DATABASE.tables.get('matchResultDraft')![0]!;
  const PAYLOAD = DRAFT.payload as { scores: Array<{ userId: string; points: number }>; teams: Array<{ label: string; userIds: string[] }>; sets: Array<{ teamA: number; teamB: number }> };
  const PARTICIPANTS = DATABASE.tables.get('matchParticipant')!.filter((_p) => _p.matchId === DRAFT.matchId);
  expect(PAYLOAD.scores.map((_s) => _s.userId).sort()).toEqual(PARTICIPANTS.map((_p) => _p.userId).sort());
  for (const TEAM of PAYLOAD.teams) {
    expect(TEAM.userIds.sort()).toEqual(PARTICIPANTS.filter((_p) => _p.teamLabel === TEAM.label).map((_p) => _p.userId).sort());
  }
  expect(PAYLOAD.sets.every((_set) => typeof _set.teamA === 'number' && typeof _set.teamB === 'number')).toBe(true);
  expect(DATABASE.tables.get('matchResult')![0]!.payload).toEqual(DRAFT.payload);
});

//? La API exige que quien crea un partido tenga esa categoría del deporte y que
//? solo los participantes propongan resultados.
it('should only seed matches the API itself could create', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await runSeedSV();
  const SPORT_CATEGORIES = DATABASE.tables.get('userSportCategory')!;
  for (const MATCH of DATABASE.tables.get('match')!) {
    expect(SPORT_CATEGORIES).toContainEqual(expect.objectContaining({ userId: MATCH.organizerUserId, sportId: MATCH.sportId, categoryId: MATCH.categoryId }));
    for (const PARTICIPANT of DATABASE.tables.get('matchParticipant')!.filter((_p) => _p.matchId === MATCH.id)) {
      expect(SPORT_CATEGORIES).toContainEqual(expect.objectContaining({ userId: PARTICIPANT.userId, sportId: MATCH.sportId, categoryId: MATCH.categoryId }));
    }
  }
  for (const DRAFT of DATABASE.tables.get('matchResultDraft')!) {
    expect(DATABASE.tables.get('matchParticipant')!).toContainEqual(expect.objectContaining({ matchId: DRAFT.matchId, userId: DRAFT.proposedByUserId }));
  }
});

//? Los torneos de pádel eran de 4ta pero la mayoría de sus inscriptos tenían
//? pádel 5ta; las categorías de tenis solo se asignaban en la primera corrida.
it('should register only players who hold the tournament category, on every run', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await runSeedSV();
  const TENNIS = DATABASE.tables.get('sport')!.find((_s) => _s.code === 'TENNIS')!;
  DATABASE.tables.set('userSportCategory', DATABASE.tables.get('userSportCategory')!.filter((_r) => _r.sportId !== TENNIS.id));
  await runSeedSV();
  const SPORT_CATEGORIES = DATABASE.tables.get('userSportCategory')!;
  const REGISTRATIONS = DATABASE.tables.get('tournamentRegistration')!.filter((_r) => _r.status === 'CONFIRMED');
  for (const TOURNAMENT of DATABASE.tables.get('tournament')!) {
    for (const REGISTRATION of REGISTRATIONS.filter((_r) => _r.tournamentId === TOURNAMENT.id)) {
      expect(SPORT_CATEGORIES).toContainEqual(expect.objectContaining({ userId: REGISTRATION.userId, sportId: TOURNAMENT.sportId, categoryId: TOURNAMENT.categoryId }));
    }
  }
});

//? Pago Móvil liquida en bolívares: el seed lo dejaba en USD como el resto.
it('should seed Pago Móvil methods settling in BS, also fixing rows from older runs', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost:1/unused');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await runSeedSV();
  const PAGO_MOVIL = () => DATABASE.tables.get('venuePaymentMethod')!.filter((_m) => _m.type === 'PAGO_MOVIL');
  for (const METHOD of PAGO_MOVIL()) METHOD.settlementCurrency = 'USD';
  await runSeedSV();
  expect(PAGO_MOVIL().length).toBeGreaterThan(0);
  expect(PAGO_MOVIL().every((_m) => _m.settlementCurrency === 'BS')).toBe(true);
  expect(DATABASE.tables.get('venuePaymentMethod')!.filter((_m) => _m.type === 'CASH').every((_m) => _m.settlementCurrency === 'USD')).toBe(true);
});
