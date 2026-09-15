import { describe, expect, it } from 'vitest';

import { CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA } from '../../presentation/validation/parametrized_tournament.validation.js';

const BASE_BODY = {
  name: 'Copa Cuádrala',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  sportId: '123e4567-e89b-12d3-a456-426614174001',
  formatPresetCode: 'ROUND_ROBIN',
};

describe('CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA — gender', () => {
  it('should default gender to undefined when omitted (legacy clients)', () => {
    const RESULT = CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse(BASE_BODY);

    expect(RESULT.gender).toBeUndefined();
  });

  it('should accept each valid MatchGender value', () => {
    for (const GENDER of ['MALE', 'FEMALE', 'MIXED'] as const) {
      const RESULT = CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse({
        ...BASE_BODY,
        gender: GENDER,
      });
      expect(RESULT.gender).toBe(GENDER);
    }
  });

  it('should reject an invalid gender value with a Spanish message', () => {
    expect(() =>
      CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse({ ...BASE_BODY, gender: 'OTRO' }),
    ).toThrow('gender debe ser MALE, FEMALE o MIXED.');
  });
});
