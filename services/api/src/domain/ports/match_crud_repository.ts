export type CreateMatchInputDTO = {
  sportId: string;
  categoryId: string;
  type: 'AMERICANO' | 'REGULAR';
  scheduledAt?: Date;
  courtId?: string;
  tournamentId?: string;
  maxParticipants: number;
};

export type UpdateMatchPatchDTO = {
  scheduledAt?: Date | null;
  courtId?: string | null;
  maxParticipants?: number;
};

export type MatchDetailDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  courtId: string | null;
  tournamentId: string | null;
  maxParticipants: number;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export interface MatchCrudRepository {
  createMatchSV(_input: CreateMatchInputDTO, _creatorUserId: string): Promise<MatchDetailDTO>;
  updateMatchSV(_matchId: string, _patch: UpdateMatchPatchDTO): Promise<MatchDetailDTO>;
  cancelMatchSV(_matchId: string): Promise<MatchDetailDTO>;
}

