export interface TransactionReceiptAccessRepository {
  transactionExistsSV(_transactionId: string): Promise<boolean>;
  userCanAccessTransactionSV(_transactionId: string, _userId: string): Promise<boolean>;
}

