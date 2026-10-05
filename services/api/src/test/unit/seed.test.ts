import { afterEach, expect, it, vi } from 'vitest';

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
      if (_model === '$disconnect') return async () => { DATABASE.finished++; };
      if (!DATABASE.tables.has(_model)) DATABASE.tables.set(_model, []);
      const ROWS = DATABASE.tables.get(_model)!;
      return {
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
  await runSeedSV();
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
