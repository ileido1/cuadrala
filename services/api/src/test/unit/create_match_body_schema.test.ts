import { describe, expect, it } from 'vitest';

import { CREATE_MATCH_BODY_SCHEMA } from '../../presentation/validation/matches.validation.js';

const SPORT_ID = '00000000-0000-4000-8000-000000000001';
const CATEGORY_ID = '00000000-0000-4000-8000-000000000002';

describe('CREATE_MATCH_BODY_SCHEMA', () => {
  it("should reject type 'OPEN' (only AMERICANO|REGULAR allowed)", () => {
    const RESULT = CREATE_MATCH_BODY_SCHEMA.safeParse({
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      type: 'OPEN',
    });
    expect(RESULT.success).toBe(false);
  });

  it('should accept a body without type (backend default applies)', () => {
    const RESULT = CREATE_MATCH_BODY_SCHEMA.safeParse({
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
    });
    expect(RESULT.success).toBe(true);
  });

  it('should parse affectsElo=false and gender', () => {
    const RESULT = CREATE_MATCH_BODY_SCHEMA.safeParse({
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
      affectsElo: false,
      gender: 'FEMALE',
    });
    expect(RESULT.success).toBe(true);
    if (RESULT.success) {
      expect(RESULT.data.affectsElo).toBe(false);
      expect(RESULT.data.gender).toBe('FEMALE');
    }
  });
});
