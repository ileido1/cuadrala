export type TransactionReceiptNotifyContextDTO = {
  matchId: string;
  categoryId: string;
  organizerUserId: string;
  payerUserId: string;
  /** Sede dueña del cobro (match.court.venueId). null si la transacción no resuelve sede. */
  venueId: string | null;
  /** userIds de TODAS las filas VenueStaff de la sede (D1: sin filtro por rol). Vacío si venueId es null. */
  venueStaffUserIds: string[];
};

export interface TransactionReceiptNotifyContextRepository {
  getForTransactionSV(_transactionId: string): Promise<TransactionReceiptNotifyContextDTO | null>;
}
