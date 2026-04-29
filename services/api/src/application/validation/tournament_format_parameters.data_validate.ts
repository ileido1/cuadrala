import { AppError } from '../../domain/errors/app_error.js';
import { TournamentFormatParametersValidatorService } from '../services/tournament_format_parameters_validator.service.js';

type ValidateTournamentFormatParametersInput = {
  presetCode: string;
  presetSchemaVersion: number;
  formatParameters?: unknown;
};

export function validateTournamentFormatParametersDVAL(
  _input: ValidateTournamentFormatParametersInput,
): unknown | undefined {
  const VALIDATOR = new TournamentFormatParametersValidatorService();
  try {
    return VALIDATOR.validateAndNormalizeSV(_input);
  } catch (_error) {
    if (_error instanceof AppError) {
      throw _error;
    }
    throw _error;
  }
}

