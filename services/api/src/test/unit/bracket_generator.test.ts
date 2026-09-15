import { describe, expect, it } from 'vitest';

import { resolveSingleEliminationRoundNameSV } from '../../domain/single_elimination/bracket_generator.js';

describe('resolveSingleEliminationRoundNameSV', () => {
  it('should name the last round "Final"', () => {
    expect(resolveSingleEliminationRoundNameSV(3, 3)).toBe('Final');
  });

  it('should name the round before the final "Semifinal"', () => {
    expect(resolveSingleEliminationRoundNameSV(2, 3)).toBe('Semifinal');
  });

  it('should name the round two before the final "Cuartos de final"', () => {
    expect(resolveSingleEliminationRoundNameSV(2, 4)).toBe('Cuartos de final');
  });

  it('should name any earlier round numerically', () => {
    expect(resolveSingleEliminationRoundNameSV(1, 4)).toBe('Ronda 1');
  });

  it('should name a round past the final "Tercer puesto"', () => {
    expect(resolveSingleEliminationRoundNameSV(4, 3)).toBe('Tercer puesto');
  });
});
