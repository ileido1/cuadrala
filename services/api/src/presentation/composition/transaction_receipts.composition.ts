import path from 'node:path';

import { GetTransactionReceiptUseCase } from '../../application/use_cases/get_transaction_receipt.use_case.js';
import { UploadTransactionReceiptUseCase } from '../../application/use_cases/upload_transaction_receipt.use_case.js';
import { LocalFilesystemReceiptStorage } from '../../infrastructure/adapters/local_filesystem_receipt_storage.js';
import { PrismaTransactionReceiptAccessRepository } from '../../infrastructure/adapters/prisma_transaction_receipt_access_repository.js';
import { PrismaTransactionReceiptRepository } from '../../infrastructure/adapters/prisma_transaction_receipt_repository.js';

const RECEIPT_STORAGE = new LocalFilesystemReceiptStorage(path.resolve(process.cwd(), 'uploads'));
const TRANSACTION_RECEIPT_REPOSITORY = new PrismaTransactionReceiptRepository();
const RECEIPT_ACCESS_REPOSITORY = new PrismaTransactionReceiptAccessRepository();

export const UPLOAD_TRANSACTION_RECEIPT_UC = new UploadTransactionReceiptUseCase(
  RECEIPT_STORAGE,
  TRANSACTION_RECEIPT_REPOSITORY,
  RECEIPT_ACCESS_REPOSITORY,
);

export const GET_TRANSACTION_RECEIPT_UC = new GetTransactionReceiptUseCase(
  RECEIPT_STORAGE,
  TRANSACTION_RECEIPT_REPOSITORY,
  RECEIPT_ACCESS_REPOSITORY,
);

