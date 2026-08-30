import { describe, expect, it } from 'vitest';

import {
  createAmericanoScheduleKeySV,
  generateAmericanoScheduleSV,
} from '../../domain/americano/americano_schedule_generator.js';

const ID = (_n: number): string =>
  `550e8400-e29b-41d4-a716-4466554400${String(_n).padStart(2, '0')}`;

const IDS = [1, 2, 3, 4, 5, 6, 7, 8].map(ID);
//? Mismo conjunto que IDS en otro orden: el generador normaliza antes de rotar,
//? asi que ambas entradas deben producir exactamente la misma salida.
const IDS_SHUFFLED = [8, 6, 4, 2, 7, 5, 3, 1].map(ID);

describe('US-E3-02 — Dominio Americano: generación de rotaciones', () => {
  it('es determinista para el mismo input', () => {
    expect(generateAmericanoScheduleSV({ participantRegistrationIds: IDS })).toEqual(
      generateAmericanoScheduleSV({ participantRegistrationIds: IDS }),
    );
  });

  it('es invariante al orden de entrada', () => {
    expect(generateAmericanoScheduleSV({ participantRegistrationIds: IDS_SHUFFLED })).toEqual(
      generateAmericanoScheduleSV({ participantRegistrationIds: IDS }),
    );
  });

  it('rechaza un conteo que no es múltiplo de 4', () => {
    const IDS_6 = [1, 2, 3, 4, 5, 6].map(ID);

    expect(() => generateAmericanoScheduleSV({ participantRegistrationIds: IDS_6 })).toThrow(
      /m[úu]ltiplo de 4/i,
    );
  });

  it('rechaza IDs repetidos', () => {
    const IDS_DUP = [1, 2, 3, 4, 1, 6, 7, 8].map(ID);

    expect(() => generateAmericanoScheduleSV({ participantRegistrationIds: IDS_DUP })).toThrow(
      /duplicad/i,
    );
  });

  it('scheduleKey es determinista e invariante al orden', () => {
    const K1 = createAmericanoScheduleKeySV({ participantRegistrationIds: IDS });
    const K2 = createAmericanoScheduleKeySV({ participantRegistrationIds: IDS });
    const K3 = createAmericanoScheduleKeySV({ participantRegistrationIds: IDS_SHUFFLED });

    expect(K1).toBe(K2);
    expect(K1).toBe(K3);
  });
});
