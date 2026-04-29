export type CreateSystemMatchInputDTO = {
  sportId: string;
  categoryId: string;
  organizerUserId: string;
  type: 'AMERICANO' | 'REGULAR';
  scheduledAt?: Date;
  courtId?: string;
  tournamentId?: string;
  pricePerPlayerCents?: number;
  maxParticipants: number;
};

export type SystemMatchDTO = {
  id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
};

export interface SystemMatchRepository {
  createScheduledMatchSV(_input: CreateSystemMatchInputDTO): Promise<SystemMatchDTO>;
}

