import type {
  ReservationLedgerBsDiscrepancyDTO,
  ReservationLedgerRepository,
} from '../../domain/ports/reservation_ledger_repository.js';

export type ReconcileReservationLedgerResultDTO = {
  checkedAt: string;
  toleranceBsMinor: string;
  discrepancyCount: number;
  discrepancies: Array<{
    reservationId: string;
    ledgerSumBsMinor: string;
    paidAmountBsMinor: string;
    deltaBsMinor: string;
  }>;
};

/** Conciliación ledger vs paidAmountBsMinor (REQ-MCP-056). */
export class ReconcileReservationLedgerUseCase {
  constructor(private readonly _ledgerRepository: ReservationLedgerRepository) {}

  async executeSV(_toleranceBsMinor: bigint): Promise<ReconcileReservationLedgerResultDTO> {
    const ROWS = await this._ledgerRepository.listBsDiscrepanciesSV(_toleranceBsMinor);
    return {
      checkedAt: new Date().toISOString(),
      toleranceBsMinor: _toleranceBsMinor.toString(),
      discrepancyCount: ROWS.length,
      discrepancies: ROWS.map((ROW) => mapDiscrepancySV(ROW)),
    };
  }
}

function mapDiscrepancySV(
  _row: ReservationLedgerBsDiscrepancyDTO,
): ReconcileReservationLedgerResultDTO['discrepancies'][number] {
  return {
    reservationId: _row.reservationId,
    ledgerSumBsMinor: _row.ledgerSumBsMinor.toString(),
    paidAmountBsMinor: _row.paidAmountBsMinor.toString(),
    deltaBsMinor: _row.deltaBsMinor.toString(),
  };
}
