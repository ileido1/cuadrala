import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { UploadTransactionReceiptUseCase } from '../../application/use_cases/upload_transaction_receipt.use_case.js';

describe('UploadTransactionReceiptUseCase', () => {
  it('should reject receipt upload when player selected CASH', async () => {
    const ACCESS = {
      transactionExistsSV: vi.fn().mockResolvedValue(true),
      userCanAccessTransactionSV: vi.fn().mockResolvedValue(true),
      getPlayerPaymentMethodTypeSV: vi.fn().mockResolvedValue('CASH'),
    };
    const UC = new UploadTransactionReceiptUseCase(
      { putSV: vi.fn() } as never,
      { createSV: vi.fn() } as never,
      ACCESS,
    );

    await expect(
      UC.executeSV({
        transactionId: 'tx-1',
        actorUserId: 'user-1',
        mimeType: 'image/png',
        sizeBytes: 100,
        content: Buffer.from('x'),
      }),
    ).rejects.toMatchObject({
      code: 'VALIDACION_FALLIDA',
    } satisfies Partial<AppError>);
  });
});
