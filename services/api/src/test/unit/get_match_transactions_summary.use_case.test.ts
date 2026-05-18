import { describe, expect, it, vi } from 'vitest';

import { GetMatchTransactionsSummaryUseCase } from '../../application/use_cases/get_match_transactions_summary.use_case.js';
import type { PaymentMatchReadRepository } from '../../domain/ports/payment_match_read_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';

describe('GetMatchTransactionsSummaryUseCase', () => {
  it('should return MoneyAmount fields with pricingCurrency from match context', async () => {
    const matchRead: PaymentMatchReadRepository = {
      findByIdSV: vi.fn().mockResolvedValue({ id: 'match-1', pricingCurrency: 'USD' }),
      findWithParticipantsSV: vi.fn(),
    };
    const txRepo: PaymentTransactionRepository = {
      listByMatchSV: vi.fn().mockResolvedValue([
        {
          id: 'tx-1',
          status: 'PENDING',
          amountBase: { toString: () => '10' },
          feeAmount: { toString: () => '1' },
          amountTotal: { toString: () => '11' },
        },
      ]),
    } as unknown as PaymentTransactionRepository;

    const uc = new GetMatchTransactionsSummaryUseCase(matchRead, txRepo);
    const result = await uc.executeSV('match-1');

    expect(result.pricingCurrency).toBe('USD');
    expect(result.totalAmountMoney).toEqual({
      amountMinor: '1100',
      currencyCode: 'USD',
    });
    expect(result.totalAmountBaseMoney.currencyCode).toBe('USD');
    expect(result.transactionCount).toBe(1);
    expect(result.pendingCount).toBe(1);
  });

  it('should throw when match is missing', async () => {
    const matchRead: PaymentMatchReadRepository = {
      findByIdSV: vi.fn().mockResolvedValue(null),
      findWithParticipantsSV: vi.fn(),
    };
    const txRepo: PaymentTransactionRepository = {
      listByMatchSV: vi.fn(),
    } as unknown as PaymentTransactionRepository;

    const uc = new GetMatchTransactionsSummaryUseCase(matchRead, txRepo);

    await expect(uc.executeSV('missing')).rejects.toMatchObject({
      code: 'PARTIDO_NO_ENCONTRADO',
      statusCode: 404,
    });
  });
});
