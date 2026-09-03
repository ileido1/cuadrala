import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { validateTournamentFormatParametersDVAL } from '../../application/validation/tournament_format_parameters.data_validate.js';

describe('Sprint 32 — E0-02: Validador de formatParameters (application)', () => {
  it('permite formatParameters undefined', () => {
    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'AMERICANO',
        presetSchemaVersion: 1,
        formatParameters: undefined,
      }),
    ).not.toThrow();
  });

  it('rechaza formatParameters no-objeto (null/array)', () => {
    for (const BAD of [null, [], 1, 'x'] as unknown[]) {
      expect(() =>
        validateTournamentFormatParametersDVAL({
          presetCode: 'AMERICANO',
          presetSchemaVersion: 1,
          formatParameters: BAD,
        }),
      ).toThrowError(AppError);
    }
  });

  it('AMERICANO v1: valida rounds y courts como int>=1', () => {
    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'AMERICANO',
        presetSchemaVersion: 1,
        formatParameters: { rounds: 1, courts: 2 },
      }),
    ).not.toThrow();

    for (const BAD of [{ rounds: 0 }, { rounds: 1.2 }, { courts: 0 }, { courts: '2' }] as unknown[]) {
      expect(() =>
        validateTournamentFormatParametersDVAL({
          presetCode: 'AMERICANO',
          presetSchemaVersion: 1,
          formatParameters: BAD,
        }),
      ).toThrowError(AppError);
    }
  });

  it('AMERICANO v1: rechaza keys extra', () => {
    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'AMERICANO',
        presetSchemaVersion: 1,
        formatParameters: { rounds: 1, extra: 1 },
      }),
    ).toThrowError(AppError);
  });

  it('ROUND_ROBIN v1: valida doubleRound?: boolean y rechaza extra', () => {
    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'ROUND_ROBIN',
        presetSchemaVersion: 1,
        formatParameters: { doubleRound: true },
      }),
    ).not.toThrow();

    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'ROUND_ROBIN',
        presetSchemaVersion: 1,
        formatParameters: { doubleRound: 'yes' },
      }),
    ).toThrowError(AppError);

    expect(() =>
      validateTournamentFormatParametersDVAL({
        presetCode: 'ROUND_ROBIN',
        presetSchemaVersion: 1,
        formatParameters: { doubleRound: true, extra: 1 },
      }),
    ).toThrowError(AppError);
  });
});

