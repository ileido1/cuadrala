import { describe, expect, it } from 'vitest';

import { enrichPlayerSportProfilesSV } from '../../application/helpers/enrich_player_sport_profiles.js';

describe('enrichPlayerSportProfilesSV', () => {
  it('should attach category name when sport has UserSportCategory', () => {
    const RESULT = enrichPlayerSportProfilesSV(
      [
        {
          id: 'p1',
          sportId: 'sport-padel',
          skillLevel: 4.5,
          sidePreference: 'RIGHT',
        },
      ],
      [
        {
          sportId: 'sport-padel',
          categoryId: 'cat-4ta',
          categoryName: '4ta',
          categorySlug: '4ta',
        },
      ],
    );

    expect(RESULT[0]?.categoryName).toBe('4ta');
    expect(RESULT[0]?.categoryId).toBe('cat-4ta');
  });

  it('should leave profile unchanged when no category for sport', () => {
    const RESULT = enrichPlayerSportProfilesSV(
      [
        {
          id: 'p1',
          sportId: 'sport-padel',
          skillLevel: 4.5,
          sidePreference: 'ANY',
        },
      ],
      [],
    );

    expect(RESULT[0]?.categoryName).toBeUndefined();
  });
});
