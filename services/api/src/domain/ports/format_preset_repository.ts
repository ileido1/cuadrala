export type TournamentFormatPresetDTO = {
  id: string;
  sportId: string;
  code: string;
  version: number;
  name: string;
  schemaVersion: number;
  defaultParameters: unknown;
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
    effectiveFrom?: Date;
  }): Promise<TournamentFormatPresetDTO>;
}

