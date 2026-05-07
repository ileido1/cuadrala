export type TransactionReceiptNotifyContextDTO = {
  matchId: string;
  categoryId: string;
  organizerUserId: string;
  payerUserId: string;
};

export interface TransactionReceiptNotifyContextRepository {
  getForTransactionSV(_transactionId: string): Promise<TransactionReceiptNotifyContextDTO | null>;
}
