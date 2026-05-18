import type {
  AppendReservationLedgerEntryInput,
  ReservationLedgerBsDiscrepancyDTO,
  ReservationLedgerRepository,
} from '../../domain/ports/reservation_ledger_repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export class PrismaReservationLedgerRepository implements ReservationLedgerRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async appendEntrySV(
    _input: AppendReservationLedgerEntryInput,
  ): Promise<{ id: string }> {
    const ROW = await this._prisma.reservationPaymentLedger.create({
      data: {
        reservationId: _input.reservationId,
        transactionId: _input.transactionId ?? null,
        entryType: _input.entryType,
        direction: _input.direction,
        amountMinor: _input.amountMinor,
        currencyCode: _input.currencyCode,
        amountBsMinor: _input.amountBsMinor ?? null,
        actorUserId: _input.actorUserId,
        reason: _input.reason ?? null,
      },
    });
    return { id: ROW.id };
  }

  async sumAmountBsMinorByReservationSV(_reservationId: string): Promise<bigint> {
    const AGG = await this._prisma.reservationPaymentLedger.aggregate({
      where: { reservationId: _reservationId },
      _sum: { amountBsMinor: true },
    });
    return AGG._sum.amountBsMinor ?? 0n;
  }

  async listBsDiscrepanciesSV(
    _toleranceBsMinor: bigint,
  ): Promise<ReservationLedgerBsDiscrepancyDTO[]> {
    const TOLERANCE = _toleranceBsMinor < 0n ? 0n : _toleranceBsMinor;
    const ROWS = await this._prisma.$queryRaw<
      Array<{
        reservationId: string;
        ledgerSumBsMinor: bigint | null;
        paidAmountBsMinor: bigint;
      }>
    >`
      SELECT
        r.id AS "reservationId",
        COALESCE(SUM(l."amountBsMinor"), 0)::bigint AS "ledgerSumBsMinor",
        r."paidAmountBsMinor" AS "paidAmountBsMinor"
      FROM "Reservation" r
      LEFT JOIN "ReservationPaymentLedger" l ON l."reservationId" = r.id
      WHERE r."paidAmountBsMinor" IS NOT NULL
      GROUP BY r.id, r."paidAmountBsMinor"
      HAVING ABS(COALESCE(SUM(l."amountBsMinor"), 0) - r."paidAmountBsMinor") > ${TOLERANCE}
    `;

    return ROWS.map((ROW) => {
      const LEDGER_SUM = ROW.ledgerSumBsMinor ?? 0n;
      const PAID = ROW.paidAmountBsMinor;
      const DELTA =
        LEDGER_SUM >= PAID ? LEDGER_SUM - PAID : PAID - LEDGER_SUM;
      return {
        reservationId: ROW.reservationId,
        ledgerSumBsMinor: LEDGER_SUM,
        paidAmountBsMinor: PAID,
        deltaBsMinor: DELTA,
      };
    });
  }
}
