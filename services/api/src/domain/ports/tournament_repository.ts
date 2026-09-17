export type TournamentCreatedDTO = {
  id: string;
  sportId: string;
  formatPresetId: string;
  presetSchemaVersion: number;
  status: string;
};

export type TournamentVisibility = 'PUBLIC' | 'PRIVATE';

/** Reusa `MatchGender` (schema.prisma). `null` = sin declarar. */
export type TournamentGender = 'MALE' | 'FEMALE' | 'MIXED';

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
    endsAt: Date | null;
    organizerUserId: string | null;
    venueId: string | null;
    /** `true` cuando se compite en duplas fijas (padel de parejas). */
    pairedRegistration: boolean;
    isCompetitive: boolean;
    inscriptionPrice: number | null;
    gender: TournamentGender | null;
    maxSlots: number | null;
    registrationClosesAt: Date | null;
    registrationCount: number;
    hasSchedule: boolean;
    matchCount: number;
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
    endsAt?: Date;
    organizerUserId?: string;
    visibility?: TournamentVisibility;
    venueId?: string;
    inscriptionPrice?: number;
    maxSlots?: number;
    registrationClosesAt?: Date;
    gender?: TournamentGender;
    pairedRegistration?: boolean;
  }): Promise<TournamentCreatedDTO>;

  updateStatusSV(
    _id: string,
    _status: string,
  ): Promise<{ id: string; name: string; status: string } | null>;

  updateVisibilitySV(
    _id: string,
    _visibility: TournamentVisibility,
  ): Promise<{ id: string; name: string; visibility: TournamentVisibility } | null>;

  updateSettingsSV?(_input: {
    tournamentId: string;
    settings: Record<string, unknown>;
  }): Promise<{
    id: string;
    name: string;
    status: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    formatParameters: unknown | null;
    startsAt: Date | null;
    endsAt: Date | null;
    venueId: string | null;
    gender: TournamentGender | null;
    pairedRegistration: boolean;
    inscriptionPrice: number | null;
    maxSlots: number | null;
    registrationClosesAt: Date | null;
  }>;
}
