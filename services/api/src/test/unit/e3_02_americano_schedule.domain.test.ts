import { describe, expect, it } from 'vitest';

type AmericanoSchedule = {
  rounds: Array<{
    roundNumber: number;
    courts: Array<{
      courtNumber: number;
      teamA: [string, string];
      teamB: [string, string];
    }>;
  }>;
};

function canonicalizeSchedule(_schedule: AmericanoSchedule): AmericanoSchedule {
  const SORTED_ROUNDS = [..._schedule.rounds]
    .map((_r) => ({
      ..._r,
      courts: [..._r.courts]
        .map((_c) => {
          const TEAM_A = [..._c.teamA].sort() as [string, string];
          const TEAM_B = [..._c.teamB].sort() as [string, string];
          const TEAMS = [TEAM_A, TEAM_B].sort((_x, _y) => _x.join('|').localeCompare(_y.join('|')));
          const T1 = (TEAMS[0] ?? TEAM_A) as [string, string];
          const T2 = (TEAMS[1] ?? TEAM_B) as [string, string];
          return {
            ..._c,
            teamA: T1,
            teamB: T2,
          };
        })
        .sort((_a, _b) => {
          const A = `${_a.teamA.join('|')}__${_a.teamB.join('|')}`;
          const B = `${_b.teamA.join('|')}__${_b.teamB.join('|')}`;
          return A.localeCompare(B);
        }),
    }))
    .sort((_a, _b) => _a.roundNumber - _b.roundNumber);

  return { rounds: SORTED_ROUNDS };
}

async function loadGenerator() {
  /**
   * Nota TDD (RED): este módulo aún no existe. El implementer debe crearlo con este export.
   * Mantener `.js` por convención ESM del repo.
   */
  const MOD = (await import('../../domain/americano/americano_schedule_generator.js')) as {
    generateAmericanoScheduleSV: (_input: { participantUserIds: string[] }) => AmericanoSchedule;
    createAmericanoScheduleKeySV: (_input: { participantUserIds: string[] }) => string;
  };

  return MOD;
}

describe('US-E3-02 — Dominio Americano: generación de rotaciones', () => {
  it('es determinista para el mismo input (misma salida deep-equal)', async () => {
    const { generateAmericanoScheduleSV } = await loadGenerator();

    const IDS = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440008',
    ];

    const OUT1 = generateAmericanoScheduleSV({ participantUserIds: IDS });
    const OUT2 = generateAmericanoScheduleSV({ participantUserIds: IDS });

    expect(OUT1).toEqual(OUT2);
  });

  it('es invariante al orden de entrada (misma rotación tras canonizar)', async () => {
    const { generateAmericanoScheduleSV } = await loadGenerator();

    const IDS_A = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440008',
    ];
    const IDS_B = [
      '550e8400-e29b-41d4-a716-446655440008',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440001',
    ];

    const OUT_A = canonicalizeSchedule(generateAmericanoScheduleSV({ participantUserIds: IDS_A }));
    const OUT_B = canonicalizeSchedule(generateAmericanoScheduleSV({ participantUserIds: IDS_B }));

    expect(OUT_A).toEqual(OUT_B);
  });

  it('rechaza conteo inválido: participantUserIds debe ser múltiplo de 4', async () => {
    const { generateAmericanoScheduleSV } = await loadGenerator();

    const IDS_6 = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
    ];

    expect(() => generateAmericanoScheduleSV({ participantUserIds: IDS_6 })).toThrow(/m[úu]ltiplo de 4/i);
  });

  it('rechaza duplicados: participantUserIds no permite IDs repetidos', async () => {
    const { generateAmericanoScheduleSV } = await loadGenerator();

    const IDS_DUP = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440008',
    ];

    expect(() => generateAmericanoScheduleSV({ participantUserIds: IDS_DUP })).toThrow(/duplicad/i);
  });

  it('scheduleKey es determinista e invariante al orden', async () => {
    const { createAmericanoScheduleKeySV } = await loadGenerator();

    const IDS_A = [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440008',
    ];
    const IDS_B = [
      '550e8400-e29b-41d4-a716-446655440008',
      '550e8400-e29b-41d4-a716-446655440006',
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440003',
      '550e8400-e29b-41d4-a716-446655440001',
    ];

    const K1 = createAmericanoScheduleKeySV({ participantUserIds: IDS_A });
    const K2 = createAmericanoScheduleKeySV({ participantUserIds: IDS_A });
    const K3 = createAmericanoScheduleKeySV({ participantUserIds: IDS_B });

    expect(K1).toBe(K2);
    expect(K1).toBe(K3);
  });
});

