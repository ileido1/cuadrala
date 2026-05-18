import type {
  AppendReservationLedgerEntryInput,
  ReservationLedgerRepository,
} from '../../domain/ports/reservation_ledger_repository.js';
import type { CurrencyCode } from '../../domain/money/currency_code.js';

/** Única puerta de escritura al libro mayor de reserva (REQ-MCP-053). */
export class RecordReservationLedgerEntryUseCase {
  constructor(
    private readonly _ledgerRepository: ReservationLedgerRepository,
  ) {}

  async executeSV(_input: {
    reservationId: string;
    transactionId: string;
    appliedToObligationMinor: bigint;
    pricingCurrency: CurrencyCode;
    amountBsMinor: bigint;
    actorUserId: string;
    reason?: string;
  }): Promise<{ id: string }> {
    const ENTRY: AppendReservationLedgerEntryInput = {
      reservationId: _input.reservationId,
      transactionId: _input.transactionId,
      entryType: 'PAYMENT',
      direction: 'CREDIT',
      amountMinor: _input.appliedToObligationMinor,
      currencyCode: _input.pricingCurrency,
      amountBsMinor: _input.amountBsMinor,
      actorUserId: _input.actorUserId,
      ...(_input.reason !== undefined ? { reason: _input.reason } : {}),
    };
    return this._ledgerRepository.appendEntrySV(ENTRY);
  }
}
