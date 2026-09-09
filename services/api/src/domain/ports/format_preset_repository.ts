export type { FormatParameterFieldSchema } from './tournament_format_parameters_validator.js';
import type { FormatParameterFieldSchema } from './tournament_format_parameters_validator.js';

export type TournamentFormatPresetDTO = {
  id: string;
  sportId: string;
  code: string;
  version: number;
  name: string;
  schemaVersion: number;
  defaultParameters: unknown;
  parametersSchema?: FormatParameterFieldSchema[] | null;
  isActive?: boolean;
  effectiveFrom?: Date;
  supersedesId?: string | null;
};

export interface FormatPresetRepository {
  listActiveFormatPresetsBySportIdSV(_sportId: string, _now: Date): Promise<TournamentFormatPresetDTO[]>;
  findByIdSV(_id: string): Promise<TournamentFormatPresetDTO | null>;
  findActiveBySportAndCodeSV(
    _sportId: string,
    _code: string,
    _now: Date,
  ): Promise<TournamentFormatPresetDTO | null>;

  publishNewVersionSV(_input: {
    sportId: string;
    code: string;
    name: string;
    schemaVersion: number;
    defaultParameters: unknown;
    parametersSchema?: FormatParameterFieldSchema[];
    effectiveFrom?: Date;
  }): Promise<TournamentFormatPresetDTO>;
}

