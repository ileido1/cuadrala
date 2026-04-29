export type MatchNotificationContextDTO = {
  matchId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  categoryId: string;
  maxParticipants: number;
  venueLat: number | null;
  venueLng: number | null;
};

export interface MatchNotificationContextReadRepository {
  getByMatchIdSV(_matchId: string): Promise<MatchNotificationContextDTO | null>;
}

