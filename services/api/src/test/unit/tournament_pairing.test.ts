import { describe, expect, it } from 'vitest';

import {
  assertPairableSV,
  collapsePairsToCompetitorsSV,
} from '../../domain/tournament/tournament_pairing.js';

const regSV = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'reg-1',
  tournamentId: 't-1',
  status: 'PENDING',
  partnerRegistrationId: null,
  ...over,
}) as never;

const BASE = {
  tournamentId: 't-1',
  pairedRegistration: true,
  first: regSV({ id: 'reg-1' }),
  second: regSV({ id: 'reg-2' }),
};

describe('assertPairableSV', () => {
  it('should accept two free registrations of the same tournament', () => {
    expect(() => assertPairableSV(BASE)).not.toThrow();
  });

  it('should refuse pairing in a tournament that is not played in pairs', () => {
    expect(() => assertPairableSV({ ...BASE, pairedRegistration: false })).toThrow(
      'Este torneo no se juega en duplas fijas.',
    );
  });

  it('should refuse pairing a registration with itself', () => {
    expect(() =>
      assertPairableSV({ ...BASE, second: regSV({ id: 'reg-1' }) }),
    ).toThrow('Una inscripción no puede formar dupla consigo misma.');
  });

  //? Emparejar inscripciones de torneos distintos mezclaria dos cuadros.
  it('should refuse a registration from another tournament', () => {
    expect(() =>
      assertPairableSV({ ...BASE, second: regSV({ id: 'reg-2', tournamentId: 't-9' }) }),
    ).toThrow('Alguna de las inscripciones no pertenece a este torneo.');
  });

  //? Media dupla entraria al cuadro el dia que se confirme la otra mitad.
  it('should refuse a withdrawn registration', () => {
    expect(() =>
      assertPairableSV({ ...BASE, second: regSV({ id: 'reg-2', status: 'WITHDRAWN' }) }),
    ).toThrow('No se puede emparejar una inscripción retirada.');
  });

  it('should refuse somebody who is already in another pair', () => {
    expect(() =>
      assertPairableSV({
        ...BASE,
        second: regSV({ id: 'reg-2', partnerRegistrationId: 'reg-8' }),
      }),
    ).toThrow('Alguno de los jugadores ya está en otra dupla. Deshacela antes.');
  });

  //? Rehacer la misma dupla es idempotente, no un conflicto.
  it('should accept re-pairing the two who are already partners', () => {
    expect(() =>
      assertPairableSV({
        ...BASE,
        first: regSV({ id: 'reg-1', partnerRegistrationId: 'reg-2' }),
        second: regSV({ id: 'reg-2', partnerRegistrationId: 'reg-1' }),
      }),
    ).not.toThrow();
  });
});

describe('collapsePairsToCompetitorsSV', () => {
  it('should turn each pair into a single competitor', () => {
    const R = collapsePairsToCompetitorsSV([
      { id: 'reg-1', partnerRegistrationId: 'reg-2' },
      { id: 'reg-2', partnerRegistrationId: 'reg-1' },
      { id: 'reg-3', partnerRegistrationId: 'reg-4' },
      { id: 'reg-4', partnerRegistrationId: 'reg-3' },
    ]);

    expect(R.competitorIds).toEqual(['reg-1', 'reg-3']);
    expect(R.unpairedIds).toEqual([]);
  });

  //? El scheduleKey depende de esta lista: si cambiara el orden entre corridas,
  //? regenerar el mismo cuadro dejaria de ser idempotente.
  it('should be deterministic regardless of the input order', () => {
    const A = collapsePairsToCompetitorsSV([
      { id: 'reg-4', partnerRegistrationId: 'reg-3' },
      { id: 'reg-2', partnerRegistrationId: 'reg-1' },
      { id: 'reg-3', partnerRegistrationId: 'reg-4' },
      { id: 'reg-1', partnerRegistrationId: 'reg-2' },
    ]);

    expect(A.competitorIds).toEqual(['reg-1', 'reg-3']);
  });

  //? Media pareja no compite: el organizador tiene que emparejarla o sacarla.
  it('should report the registrations that have no partner', () => {
    const R = collapsePairsToCompetitorsSV([
      { id: 'reg-1', partnerRegistrationId: 'reg-2' },
      { id: 'reg-2', partnerRegistrationId: 'reg-1' },
      { id: 'reg-5', partnerRegistrationId: null },
    ]);

    expect(R.competitorIds).toEqual(['reg-1']);
    expect(R.unpairedIds).toEqual(['reg-5']);
  });

  //? El companero puede estar apuntado pero fuera del roster confirmado.
  it('should treat a pair as incomplete when the partner is not in the roster', () => {
    const R = collapsePairsToCompetitorsSV([
      { id: 'reg-1', partnerRegistrationId: 'reg-9' },
    ]);

    expect(R.competitorIds).toEqual([]);
    expect(R.unpairedIds).toEqual(['reg-1']);
  });
});
