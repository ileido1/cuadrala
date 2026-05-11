// Tipos DTO para consulta de torneos (solo lectura).
// El puerto de escritura sigue siendo TournamentRepository.

export type TournamentStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';

export type TournamentListItemDTO = {
  id: string;
  name: string;
  status: TournamentStatus;
  sportId: string;
  sportName: string;
  categoryId: string;
  categoryName: string;
  startsAt: string | null;
  registrationCount: number;
  maxParticipants: number;
};

export type TournamentDetailDTO = TournamentListItemDTO & {
  formatPresetId: string;
  formatPresetName: string;
  presetSchemaVersion: number;
  formatParameters: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type RegistrationDTO = {
  id: string;
  userId: string;
  userName: string;
  status: RegistrationStatus;
  createdAt: string;
};

export type ListTournamentsFiltersDTO = {
  status?: TournamentStatus;
  sportId?: string;
  categoryId?: string;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export interface TournamentQueryRepository {
  listTournamentsSV(
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }>;

  getTournamentByIdSV(_tournamentId: string): Promise<TournamentDetailDTO | null>;

  listTournamentRegistrationsSV(
    _tournamentId: string,
  ): Promise<RegistrationDTO[]>;
}