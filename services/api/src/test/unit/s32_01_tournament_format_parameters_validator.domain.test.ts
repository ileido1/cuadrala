import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { DefaultTournamentFormatParametersValidator } from '../../domain/services/tournament/tournament_format_parameters_validator.js';
import type { FormatParameterFieldSchema } from '../../domain/ports/format_preset_repository.js';

describe('S32 — Generic Tournament Format Parameters Validator (domain)', () => {
  const VALIDATOR = new DefaultTournamentFormatParametersValidator();

  describe('Schema-based validation', () => {
    it('accepts undefined formatParameters when no schema defined', () => {
      const RESULT = VALIDATOR.validateAndNormalizeSV({
        parametersSchema: [],
        formatParameters: undefined,
      });
      expect(RESULT).toBeUndefined();
    });

    it('rejects non-object formatParameters', () => {
      for (const BAD of [null, [], 1, 'x'] as unknown[]) {
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: [],
            formatParameters: BAD,
          }),
        ).toThrowError(AppError);
      }
    });

    describe('Boolean field validation', () => {
      it('accepts and normalizes valid boolean field', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false },
        ];
        const RESULT = VALIDATOR.validateAndNormalizeSV({
          parametersSchema: SCHEMA,
          formatParameters: { doubleRound: true },
        });
        expect(RESULT).toEqual({ doubleRound: true });
      });

      it('rejects non-boolean value for boolean field', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: { doubleRound: 'yes' },
          }),
        ).toThrowError(AppError);
      });

      it('accepts optional boolean field when missing', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false },
        ];
        const RESULT = VALIDATOR.validateAndNormalizeSV({
          parametersSchema: SCHEMA,
          formatParameters: {},
        });
        expect(RESULT).toEqual({});
      });

      it('rejects required boolean field when missing', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: true },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: {},
          }),
        ).toThrowError(AppError);
      });
    });

    describe('Int field validation', () => {
      it('accepts valid int within bounds', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'rounds', type: 'int', label: 'Rondas', min: 1, max: 50, required: false },
        ];
        const RESULT = VALIDATOR.validateAndNormalizeSV({
          parametersSchema: SCHEMA,
          formatParameters: { rounds: 10 },
        });
        expect(RESULT).toEqual({ rounds: 10 });
      });

      it('rejects int below min', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'rounds', type: 'int', label: 'Rondas', min: 1, max: 50, required: false },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: { rounds: 0 },
          }),
        ).toThrowError(AppError);
      });

      it('rejects int above max', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'rounds', type: 'int', label: 'Rondas', min: 1, max: 50, required: false },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: { rounds: 100 },
          }),
        ).toThrowError(AppError);
      });

      it('rejects non-integer value for int field', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          { key: 'rounds', type: 'int', label: 'Rondas', min: 1, max: 50, required: false },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: { rounds: 10.5 },
          }),
        ).toThrowError(AppError);
      });
    });

    describe('Enum field validation', () => {
      it('accepts valid enum value', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          {
            key: 'format',
            type: 'enum',
            label: 'Categoría',
            required: true,
            options: [
              { value: 'SINGLES', label: 'Singles' },
              { value: 'DOUBLES', label: 'Dobles' },
            ],
          },
        ];
        const RESULT = VALIDATOR.validateAndNormalizeSV({
          parametersSchema: SCHEMA,
          formatParameters: { format: 'SINGLES' },
        });
        expect(RESULT).toEqual({ format: 'SINGLES' });
      });

      it('rejects invalid enum value', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          {
            key: 'format',
            type: 'enum',
            label: 'Categoría',
            required: true,
            options: [
              { value: 'SINGLES', label: 'Singles' },
              { value: 'DOUBLES', label: 'Dobles' },
            ],
          },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: { format: 'MIXED' },
          }),
        ).toThrowError(AppError);
      });

      it('rejects required enum field when missing', () => {
        const SCHEMA: FormatParameterFieldSchema[] = [
          {
            key: 'format',
            type: 'enum',
            label: 'Categoría',
            required: true,
            options: [
              { value: 'SINGLES', label: 'Singles' },
              { value: 'DOUBLES', label: 'Dobles' },
            ],
          },
        ];
        expect(() =>
          VALIDATOR.validateAndNormalizeSV({
            parametersSchema: SCHEMA,
            formatParameters: {},
          }),
        ).toThrowError(AppError);
      });
    });

    it('rejects extra keys not in schema', () => {
      const SCHEMA: FormatParameterFieldSchema[] = [
        { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false },
      ];
      expect(() =>
        VALIDATOR.validateAndNormalizeSV({
          parametersSchema: SCHEMA,
          formatParameters: { doubleRound: true, extra: 1 },
        }),
      ).toThrowError(AppError);
    });

    it('validates multiple fields together (Tennis v2)', () => {
      const SCHEMA: FormatParameterFieldSchema[] = [
        { key: 'doubleRound', type: 'boolean', label: 'Doble vuelta', required: false },
        {
          key: 'format',
          type: 'enum',
          label: 'Categoría',
          required: true,
          options: [
            { value: 'SINGLES', label: 'Singles' },
            { value: 'DOUBLES', label: 'Dobles' },
          ],
        },
      ];
      const RESULT = VALIDATOR.validateAndNormalizeSV({
        parametersSchema: SCHEMA,
        formatParameters: { doubleRound: false, format: 'SINGLES' },
      });
      expect(RESULT).toEqual({ doubleRound: false, format: 'SINGLES' });
    });
  });
});
