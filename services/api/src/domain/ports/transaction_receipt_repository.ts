export type TransactionReceiptCreateDTO = {
  id: string;
  transactionId: string;
  uploaderUserId: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
};

export type TransactionReceiptDTO = {
  id: string;
  transactionId: string;
  uploaderUserId: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
};

export interface TransactionReceiptRepository {
  createSV(_data: TransactionReceiptCreateDTO): Promise<TransactionReceiptDTO>;
  findByIdSV(_receiptId: string): Promise<TransactionReceiptDTO | null>;
}

