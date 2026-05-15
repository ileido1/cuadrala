export type PlayerProfileDTO = {
  userId: string;
  dominantHand: 'RIGHT' | 'LEFT' | 'AMBIDEXTROUS';
  sidePreference: 'RIGHT' | 'LEFT' | 'ANY';
  birthYear: number | null;
  birthDate: Date | null;
  phone: string | null;
  documentNumber: string | null;
  avatarUrl: string | null;
  city: string | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertPlayerProfileDTO = {
  dominantHand?: PlayerProfileDTO['dominantHand'];
  sidePreference?: PlayerProfileDTO['sidePreference'];
  birthYear?: number | null;
  birthDate?: Date | null;
  phone?: string | null;
  documentNumber?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  onboardingCompletedAt?: Date | null;
};

export interface PlayerProfileRepository {
  findByUserIdSV(_userId: string): Promise<PlayerProfileDTO | null>;
  upsertByUserIdSV(_userId: string, _patch: UpsertPlayerProfileDTO): Promise<PlayerProfileDTO>;
}
