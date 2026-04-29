export type VacantHourStatusDTO = 'PUBLISHED' | 'CANCELLED';

export type VacantHourDTO = {
  id: string;
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  status: VacantHourStatusDTO;
  matchId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateVacantHourInputDTO = {
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  pricePerPlayerCents?: number;
  maxParticipants?: number;
  matchId?: string;
};

export type VacantHourListFiltersDTO = {
  venueId?: string;
  courtId?: string;
  status?: VacantHourStatusDTO;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export interface VacantHourRepository {
  createVacantHourSV(_input: CreateVacantHourInputDTO): Promise<VacantHourDTO>;
  findByIdSV(_id: string): Promise<VacantHourDTO | null>;
  findByCourtAndScheduledAtSV(_courtId: string, _scheduledAt: Date): Promise<VacantHourDTO | null>;
  listVacantHoursSV(
    _filters: VacantHourListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: VacantHourDTO[]; total: number }>;
  cancelVacantHourSV(_id: string): Promise<VacantHourDTO>;
}

