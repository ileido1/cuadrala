export interface TransactionReceiptAccessRepository {
  transactionExistsSV(_transactionId: string): Promise<boolean>;
  userCanAccessTransactionSV(_transactionId: string, _userId: string): Promise<boolean>;
  /** Tipo del medio elegido por el jugador (`paymentData.playerSelection.type` o método sede). */
  getPlayerPaymentMethodTypeSV(_transactionId: string): Promise<string | null>;
}

