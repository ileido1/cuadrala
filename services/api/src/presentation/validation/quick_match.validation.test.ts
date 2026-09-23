import { describe, expect, it } from 'vitest';

import { START_QUICK_MATCH_BODY_SCHEMA } from './quick_match.validation.js';

const SPORT_ID = '550e8400-e29b-41d4-a716-446655440001';

const VALID_SEARCH = {
  sportId: SPORT_ID,
  categoryId: '550e8400-e29b-41d4-a716-446655440002',
  day: 'TODAY',
  slots: ['EVENING'],
  widenLevel: false,
  zoneKm: 10,
  includeOpenMatches: true,
};

describe('START_QUICK_MATCH_BODY_SCHEMA', () => {
  it('accepts a valid availability-first search', () => {
    expect(START_QUICK_MATCH_BODY_SCHEMA.safeParse(VALID_SEARCH).success).toBe(true);
  });

  it('rejects a search with no time slots', () => {
    expect(
      START_QUICK_MATCH_BODY_SCHEMA.safeParse({
        ...VALID_SEARCH,
        slots: [],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields so the matching contract stays explicit', () => {
    expect(
      START_QUICK_MATCH_BODY_SCHEMA.safeParse({
        ...VALID_SEARCH,
        etaMinutes: 5,
      }).success,
    ).toBe(false);
  });
});
