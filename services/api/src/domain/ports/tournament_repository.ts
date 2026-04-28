export type TournamentCreatedDTO = {
  id: string;
  sportId: string;
  formatPresetId: string;
  presetSchemaVersion: number;
  status: string;
};

export interface TournamentRepository {
  findByIdSV(_id: string): Promise<{
    id: string;
    sportId: string;
    categoryId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    formatParameters: unknown | null;
    status: string;
    startsAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>;

  createTournamentSV(_data: {
    name: string;
    categoryId: string;
    sportId: string;
    formatPresetId: string;
    formatParameters?: unknown;
    presetSchemaVersion: number;
    startsAt?: Date;
  }): Promise<TournamentCreatedDTO>;
}

