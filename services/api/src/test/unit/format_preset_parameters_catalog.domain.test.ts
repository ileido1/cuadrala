import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { FORMAT_PRESET_V1_PARAMETERS_SCHEMAS } from '../../domain/services/tournament/format_preset_parameters_catalog.js';
import { DefaultTournamentFormatParametersValidator } from '../../domain/services/tournament/tournament_format_parameters_validator.js';

//? The v1 presets used to be validated by preset code. Since the validator
//? only reads `parametersSchema`, a v1 preset without a schema rejects every
//? parameter; this catalog is what the seed, the test helper and the backfill
//? migration give each v1 preset.
describe('Catálogo de parametersSchema de los presets v1 (domain)', () => {
  const VALIDATOR = new DefaultTournamentFormatParametersValidator();

  it.each([
    ['AMERICANO', { rounds: 2, courts: 1 }],
    ['ROUND_ROBIN', { doubleRound: true }],
    ['SINGLE_ELIMINATION', { thirdPlaceMatch: false }],
  ] as const)('%s v1 acepta sus parámetros declarados', (_code, _params) => {
    const RESULT = VALIDATOR.validateAndNormalizeSV({
      parametersSchema: FORMAT_PRESET_V1_PARAMETERS_SCHEMAS[_code],
      formatParameters: _params,
    });

    expect(RESULT).toEqual(_params);
  });

  it.each([
    ['ROUND_ROBIN', { doubleRound: 'yes' }],
    ['AMERICANO', { rounds: 0 }],
    ['ROUND_ROBIN', { doubleRound: true, extra: 1 }],
  ] as const)('%s v1 rechaza %j con VALIDACION_FALLIDA', (_code, _params) => {
    expect(() =>
      VALIDATOR.validateAndNormalizeSV({
        parametersSchema: FORMAT_PRESET_V1_PARAMETERS_SCHEMAS[_code],
        formatParameters: _params,
      }),
    ).toThrowError(AppError);
  });
});
