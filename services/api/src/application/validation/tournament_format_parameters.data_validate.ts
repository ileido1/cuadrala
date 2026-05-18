import { AppError } from '../../domain/errors/app_error.js';
import { DefaultTournamentFormatParametersValidator } from '../../domain/services/tournament/tournament_format_parameters_validator.js';

type ValidateTournamentFormatParametersInput = {
  presetCode: string;
  presetSchemaVersion: number;
  formatParameters?: unknown;
};

const FORMAT_PARAMETERS_VALIDATOR = new DefaultTournamentFormatParametersValidator();

export function validateTournamentFormatParametersDVAL(
  _input: ValidateTournamentFormatParametersInput,
): unknown | undefined {
  try {
    return FORMAT_PARAMETERS_VALIDATOR.validateAndNormalizeSV(_input);
  } catch (_error) {
    if (_error instanceof AppError) {
      throw _error;
    }
    throw _error;
  }
}
