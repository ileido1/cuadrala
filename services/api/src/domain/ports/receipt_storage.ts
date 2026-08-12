export type ReceiptPutDTO = {
  transactionId: string;
  receiptId: string;
  mimeType: string;
  sizeBytes: number;
  originalFileName?: string | undefined;
  content: Buffer;
};

export type ReceiptGetDTO = {
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
};

export interface ReceiptStorage {
  putSV(_data: ReceiptPutDTO): Promise<{ storageKey: string }>;
  getSV(_storageKey: string): Promise<ReceiptGetDTO | null>;
}

