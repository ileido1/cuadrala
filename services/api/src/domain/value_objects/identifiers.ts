/** Identificadores tipados (UUID string) por agregado. */

export type ReservationId = string;
export type TransactionId = string;
export type VenueId = string;
export type CourtId = string;
export type UserId = string;
export type MatchId = string;
export type PaymentObligationId = string;

export const asReservationId = (_id: string): ReservationId => _id;
export const asTransactionId = (_id: string): TransactionId => _id;
export const asVenueId = (_id: string): VenueId => _id;
export const asCourtId = (_id: string): CourtId => _id;
export const asUserId = (_id: string): UserId => _id;
export const asMatchId = (_id: string): MatchId => _id;
export const asPaymentObligationId = (
  _id: string,
): PaymentObligationId => _id;
