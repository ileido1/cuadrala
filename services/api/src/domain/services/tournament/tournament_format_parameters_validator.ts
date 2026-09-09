import { AppError } from '../../errors/app_error.js';
import type {
  FormatParameterFieldSchema,
  TournamentFormatParametersValidator,
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

export class DefaultTournamentFormatParametersValidator
  implements TournamentFormatParametersValidator
{
  validateAndNormalizeSV(_input: {
    parametersSchema: FormatParameterFieldSchema[];
    formatParameters?: unknown;
  }): unknown | undefined {
    if (_input.formatParameters === undefined) {
      return undefined;
    }

    if (!isPlainObject(_input.formatParameters)) {
      throwValidationFailed();
    }

    const PARAMS = _input.formatParameters;
    const SCHEMA = _input.parametersSchema;
    const ALLOWED_KEYS = SCHEMA.map((f) => f.key);

    // Check for extra keys
    assertNoExtraKeys(PARAMS, ALLOWED_KEYS);

    const OUT: Record<string, unknown> = {};

    // Validate each field in schema
    for (const FIELD_DEF of SCHEMA) {
      const VALUE = PARAMS[FIELD_DEF.key];

      // Check required
      if (FIELD_DEF.required && VALUE === undefined) {
        throwValidationFailed();
      }

      // Skip if field is optional and missing
      if (VALUE === undefined) {
        continue;
      }

      // Type-specific validation
      if (FIELD_DEF.type === 'boolean') {
        if (typeof VALUE !== 'boolean') {
          throwValidationFailed();
        }
        OUT[FIELD_DEF.key] = VALUE;
      } else if (FIELD_DEF.type === 'int') {
        if (typeof VALUE !== 'number' || !Number.isInteger(VALUE)) {
          throwValidationFailed();
        }
        if (FIELD_DEF.min !== undefined && VALUE < FIELD_DEF.min) {
          throwValidationFailed();
        }
        if (FIELD_DEF.max !== undefined && VALUE > FIELD_DEF.max) {
          throwValidationFailed();
        }
        OUT[FIELD_DEF.key] = VALUE;
      } else if (FIELD_DEF.type === 'enum') {
        const VALID_OPTIONS = FIELD_DEF.options.map((o) => o.value);
        if (!VALID_OPTIONS.includes(VALUE as string)) {
          throwValidationFailed();
        }
        OUT[FIELD_DEF.key] = VALUE;
      }
    }

    return OUT;
  }
}
