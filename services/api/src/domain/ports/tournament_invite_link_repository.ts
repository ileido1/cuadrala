/**
 * DTO plano de un `TournamentInviteLink`. Nunca incluye el token crudo ni el
 * `tokenHash` — ver REQ-TIL-002 (el token crudo solo se devuelve una vez, en
 * la respuesta de `createSV`; el hash nunca se expone fuera de infraestructura).
 */
export type TournamentInviteLinkDTO = {
  id: string;
  tournamentId: string;
  createdByUserId: string;
  expiresAt: Date;
  maxUses: number | null;
  usesCount: number;
  revokedAt: Date | null;
  createdAt: Date;
};

/** Una inscripción que usó un link, para el listado de REQ-TIL-006. */
export type TournamentInviteLinkRegistrantDTO = {
  registrationId: string;
  type: 'AUTHENTICATED' | 'GUEST';
  displayName: string;
  registeredAt: Date;
};

export type TournamentInviteLinkWithRegistrantsDTO = TournamentInviteLinkDTO & {
  registrants: TournamentInviteLinkRegistrantDTO[];
};

export interface TournamentInviteLinkRepository {
  /** Genera el token crudo (randomBytes(32) base64url), lo hashea y persiste; devuelve ambos. */
  createSV(_input: {
    tournamentId: string;
    createdByUserId: string;
    expiresAt: Date;
    maxUses: number | null;
  }): Promise<{ link: TournamentInviteLinkDTO; token: string }>;

  /** Hashea `_rawToken` internamente y busca por `tokenHash` (nunca compara crudo). */
  findByTokenHashSV(_rawToken: string): Promise<TournamentInviteLinkDTO | null>;

  findByIdAndTournamentIdSV(
    _id: string,
    _tournamentId: string,
  ): Promise<TournamentInviteLinkDTO | null>;

  listByTournamentIdWithRegistrantsSV(
    _tournamentId: string,
  ): Promise<TournamentInviteLinkWithRegistrantsDTO[]>;

  incrementUsesCountSV(_id: string): Promise<void>;

  /** Idempotente: revocar un link ya revocado no es error. */
  revokeSV(_id: string): Promise<void>;
}
