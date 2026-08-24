export type TournamentCreatedDTO = {
  id: string;
  sportId: string;
  formatPresetId: string;
  presetSchemaVersion: number;
  status: string;
};

export type TournamentVisibility = 'PUBLIC' | 'PRIVATE';

export interface TournamentRepository {
  findByIdSV(_id: string): Promise<{
    id: string;
    name: string;
    sportId: string;
    categoryId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    formatParameters: unknown | null;
    status: string;
    visibility: TournamentVisibility | null;
    startsAt: Date | null;
    organizerUserId: string | null;
    venueId: string | null;
    isCompetitive: boolean;
    inscriptionPrice: number | null;
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
    organizerUserId?: string;
    visibility?: TournamentVisibility;
  }): Promise<TournamentCreatedDTO>;

  updateStatusSV(
    _id: string,
    _status: string,
  ): Promise<{ id: string; name: string; status: string } | null>;

  updateVisibilitySV(
    _id: string,
    _visibility: TournamentVisibility,
  ): Promise<{ id: string; name: string; visibility: TournamentVisibility } | null>;
}

