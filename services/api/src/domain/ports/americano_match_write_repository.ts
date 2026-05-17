export type CreateAmericanoMatchInput = {
  categoryId: string;
  sportId: string;
  formatPresetId: string;
  formatParameters?: unknown;
  courtId?: string;
  tournamentId?: string;
  scheduledAt?: Date;
  participantUserIds: string[];
};

export type CreatedAmericanoMatchDTO = {
  id: string;
  status: string;
  type: string;
  sportId: string;
  formatPresetId: string | null;
  participantCount: number;
};

export interface AmericanoMatchWriteRepository {
  createAmericanoMatchSV(_data: CreateAmericanoMatchInput): Promise<CreatedAmericanoMatchDTO>;
}
