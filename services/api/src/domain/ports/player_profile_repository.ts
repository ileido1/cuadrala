export type PlayerProfileDTO = {
  userId: string;
  dominantHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS';
  sidePreference: 'RIGHT' | 'LEFT' | 'ANY';
  birthYear: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertPlayerProfileDTO = {
  dominantHand?: PlayerProfileDTO['dominantHand'];
  sidePreference?: PlayerProfileDTO['sidePreference'];
  birthYear?: number | null;
};

export interface PlayerProfileRepository {
  findByUserIdSV(_userId: string): Promise<PlayerProfileDTO | null>;
  upsertByUserIdSV(_userId: string, _patch: UpsertPlayerProfileDTO): Promise<PlayerProfileDTO>;
}

