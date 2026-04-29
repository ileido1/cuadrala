export type ValidateTournamentFormatParametersInput = {
  presetCode: string;
  presetSchemaVersion: number;
  formatParameters?: unknown;
};

export interface TournamentFormatParametersValidator {
  validateAndNormalizeSV(_input: ValidateTournamentFormatParametersInput): unknown | undefined;
}

