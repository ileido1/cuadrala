export type FormatParameterFieldSchema =
  | { key: string; type: 'boolean'; label: string; required?: boolean }
  | { key: string; type: 'int'; label: string; required?: boolean; min?: number; max?: number }
  | {
      key: string;
      type: 'enum';
      label: string;
      required?: boolean;
      options: Array<{ value: string; label: string }>;
    };

export interface TournamentFormatParametersValidator {
  validateAndNormalizeSV(_input: {
    parametersSchema: FormatParameterFieldSchema[];
    formatParameters?: unknown;
  }): unknown | undefined;
}

