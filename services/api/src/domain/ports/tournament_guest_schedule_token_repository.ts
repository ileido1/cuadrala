export type GuestScheduleTokenRecord = {
  id: string;
  tokenHash: string;
  registrationId: string;
  tournamentId: string;
  guestName: string | null;
  guestEmail: string | null;
  expiresAt: Date;
  usedAt: Date | null;
};

export interface TournamentGuestScheduleTokenRepository {
  issueSV(_registrationId: string, _expiresAt: Date): Promise<string>;
  findByHashSV(_tokenHash: string): Promise<GuestScheduleTokenRecord | null>;
  markUsedSV(_tokenId: string): Promise<void>;
}
