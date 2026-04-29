export interface MatchOrganizerRepository {
  /** Devuelve el organizerUserId del match o null si no existe. */
  getOrganizerUserIdByMatchIdSV(_matchId: string): Promise<string | null>;
}

