import type { TournamentNotificationEventType } from '../notifications/tournament_notification_events.js';

export type NotificationEventDTO = {
  id: string;
  type:
    | 'MATCH_SLOT_OPENED'
    | 'MATCH_CANCELLED'
    | 'CHAT_MESSAGE'
    | 'PAYMENT_PENDING'
    | 'MATCH_PLAYER_JOINED'
    | 'PAYMENT_CONFIRMED'
    | TournamentNotificationEventType;
  /// Sujeto del evento: uno de los dos, nunca ambos (CHECK en la base).
  matchId: string | null;
  tournamentId: string | null;
  categoryId: string;
  payload: unknown;
  createdAt: Date;
  processedAt: Date | null;
};

export type CreateMatchSlotOpenedEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreateMatchCancelledEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreateChatMessageEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreatePaymentPendingEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreateMatchPlayerJoinedEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

export type CreatePaymentConfirmedEventDTO = {
  matchId: string;
  categoryId: string;
  payload: unknown;
};

/**
 * Un solo alta parametrizada para los cuatro eventos de torneo.
 *
 * Los seis eventos de partido tienen un método propio cada uno —seis inserts
 * idénticos que solo difieren en un literal—. Repetir ese molde acá sumaría
 * cuatro copias más de lo mismo, así que el tipo viaja como dato.
 */
export type CreateTournamentEventDTO = {
  type: TournamentNotificationEventType;
  tournamentId: string;
  categoryId: string;
  payload: unknown;
};

export interface NotificationEventRepository {
  createTournamentEventSV(_dto: CreateTournamentEventDTO): Promise<NotificationEventDTO>;
  createMatchSlotOpenedSV(_dto: CreateMatchSlotOpenedEventDTO): Promise<NotificationEventDTO>;
  createMatchCancelledSV(_dto: CreateMatchCancelledEventDTO): Promise<NotificationEventDTO>;
  createChatMessageSV(_dto: CreateChatMessageEventDTO): Promise<NotificationEventDTO>;
  createPaymentPendingSV(_dto: CreatePaymentPendingEventDTO): Promise<NotificationEventDTO>;
  createMatchPlayerJoinedSV(_dto: CreateMatchPlayerJoinedEventDTO): Promise<NotificationEventDTO>;
  createPaymentConfirmedSV(_dto: CreatePaymentConfirmedEventDTO): Promise<NotificationEventDTO>;
  listPendingSV(_limit: number): Promise<NotificationEventDTO[]>;
  countPendingSV(): Promise<number>;
  markProcessedSV(_eventId: string, _processedAt: Date): Promise<void>;
}

