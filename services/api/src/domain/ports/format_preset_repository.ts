export type TournamentFormatPresetDTO = {
  id: string;
  sportId: string;
  code: string;
  version: number;
  name: string;
  schemaVersion: number;
  defaultParameters: unknown;
};

export interface FormatPresetRepository {
  listActiveFormatPresetsBySportIdSV(_sportId: string, _now: Date): Promise<TournamentFormatPresetDTO[]>;
  findByIdSV(_id: string): Promise<TournamentFormatPresetDTO | null>;
  findActiveBySportAndCodeSV(
    _sportId: string,
    _code: string,
    _now: Date,
  ): Promise<TournamentFormatPresetDTO | null>;
}

