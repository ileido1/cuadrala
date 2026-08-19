import { describe, expect, it } from 'vitest';

import { shouldApplyTournamentEloSV } from '../../domain/tournament/tournament_elo_eligibility.js';

describe('shouldApplyTournamentEloSV', () => {
  it('returns false for a free recreational tournament', () => {
    expect(shouldApplyTournamentEloSV({ isCompetitive: false, inscriptionPrice: null })).toBe(
      false,
    );
  });

  it('returns false for a paid recreational tournament', () => {
    expect(shouldApplyTournamentEloSV({ isCompetitive: false, inscriptionPrice: 50 })).toBe(
      false,
    );
  });

  it('returns false for a free competitive tournament', () => {
    expect(shouldApplyTournamentEloSV({ isCompetitive: true, inscriptionPrice: null })).toBe(
      false,
    );
  });

  it('returns true for a paid competitive tournament', () => {
    expect(shouldApplyTournamentEloSV({ isCompetitive: true, inscriptionPrice: 50 })).toBe(true);
  });

  it('returns false for a competitive tournament with inscriptionPrice of exactly 0', () => {
    expect(shouldApplyTournamentEloSV({ isCompetitive: true, inscriptionPrice: 0 })).toBe(false);
  });
});
