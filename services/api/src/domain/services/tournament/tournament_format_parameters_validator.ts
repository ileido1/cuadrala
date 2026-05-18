import { AppError } from '../../errors/app_error.js';
import type {
  TournamentFormatParametersValidator,
  ValidateTournamentFormatParametersInput,
} from '../../ports/tournament_format_parameters_validator.js';

function isPlainObject(_value: unknown): _value is Record<string, unknown> {
  if (typeof _value !== 'object' || _value === null) {
    return false;
  }
  if (Array.isArray(_value)) {
    return false;
  }
  return true;
}

function throwValidationFailed(): never {
  throw new AppError(
    'VALIDACION_FALLIDA',
    'Los parámetros del formato no son válidos.',
    400,
  );
}

function assertNoExtraKeys(_obj: Record<string, unknown>, _allowedKeys: string[]): void {
  const ALLOWED = new Set(_allowedKeys);
  for (const KEY of Object.keys(_obj)) {
    if (!ALLOWED.has(KEY)) {
      throwValidationFailed();
    }
  }
}

function assertIntGte1(_value: unknown): void {
  if (typeof _value !== 'number' || !Number.isInteger(_value) || _value < 1) {
    throwValidationFailed();
  }
}

export class DefaultTournamentFormatParametersValidator
  implements TournamentFormatParametersValidator
{
  validateAndNormalizeSV(
    _input: ValidateTournamentFormatParametersInput,
  ): unknown | undefined {
    if (_input.formatParameters === undefined) {
      return undefined;
    }

    if (!isPlainObject(_input.formatParameters)) {
      throwValidationFailed();
    }

    const PARAMS = _input.formatParameters;

    if (_input.presetCode === 'AMERICANO' && _input.presetSchemaVersion === 1) {
      assertNoExtraKeys(PARAMS, ['rounds', 'courts']);

      const OUT: { rounds?: number; courts?: number } = {};
      if (PARAMS.rounds !== undefined) {
        assertIntGte1(PARAMS.rounds);
        OUT.rounds = PARAMS.rounds as number;
      }
      if (PARAMS.courts !== undefined) {
        assertIntGte1(PARAMS.courts);
        OUT.courts = PARAMS.courts as number;
      }

      return OUT;
    }

    if (_input.presetCode === 'ROUND_ROBIN' && _input.presetSchemaVersion === 1) {
      assertNoExtraKeys(PARAMS, ['doubleRound']);

      const OUT: { doubleRound?: boolean } = {};
      if (PARAMS.doubleRound !== undefined) {
        if (typeof PARAMS.doubleRound !== 'boolean') {
          throwValidationFailed();
        }
        OUT.doubleRound = PARAMS.doubleRound;
      }

      return OUT;
    }

    if (_input.presetCode === 'SINGLE_ELIMINATION' && _input.presetSchemaVersion === 1) {
      assertNoExtraKeys(PARAMS, ['thirdPlaceMatch']);

      const OUT: { thirdPlaceMatch?: boolean } = {};
      if (PARAMS.thirdPlaceMatch !== undefined) {
        if (typeof PARAMS.thirdPlaceMatch !== 'boolean') {
          throwValidationFailed();
        }
        OUT.thirdPlaceMatch = PARAMS.thirdPlaceMatch;
      }

      return OUT;
    }

    throwValidationFailed();
  }
}
