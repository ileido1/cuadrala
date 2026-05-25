import { Prisma } from '../../generated/prisma/client.js';
import type { Prisma as PrismaTypes } from '../../generated/prisma/client.js';
import type {
  CreatePaymentTransactionInput,
  PaymentTransactionRepository,
  PaymentTransactionRow,
} from '../../domain/ports/payment_transaction_repository.js';
import type {
  ConfirmStaffTransactionInput,
  ListPendingStaffTransactionsFilters,
  PendingStaffTransactionRow,
  StaffTransactionRow,
} from '../../domain/ports/venue_staff_transaction_repository.js';
import type { VenueStaffTransactionRepository } from '../../domain/ports/venue_staff_transaction_repository.js';

import {
  isMultiCurrencyPaymentsEnabledSV,
  isReservationPaymentLedgerEnabledSV,
} from '../../config/feature_flags.js';
import { PRISMA } from '../prisma_client.js';
import {
  mapPrismaTransactionToPaymentRowSV,
  mapPrismaTransactionToPendingStaffRowSV,
  type PendingTransactionPrismaRow,
  mapPrismaTransactionToStaffRowSV,
} from './prisma_payment_transaction_mapper.js';

export class PrismaPaymentTransactionRepository
  implements PaymentTransactionRepository, VenueStaffTransactionRepository
{
  async findPendingOrConfirmedForMatchUserSV(
    _matchId: string,
    _userId: string,
  ): Promise<PaymentTransactionRow | null> {
    const ROW = await PRISMA.transaction.findFirst({
      where: {
        matchId: _matchId,
        userId: _userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    return ROW === null ? null : mapPrismaTransactionToPaymentRowSV(ROW);
  }

  async findPendingForReservationUserSV(
    _reservationId: string,
    _userId: string,
  ): Promise<PaymentTransactionRow | null> {
    const ROW = await PRISMA.transaction.findFirst({
      where: {
        reservationId: _reservationId,
        userId: _userId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
    return ROW === null ? null : mapPrismaTransactionToPaymentRowSV(ROW);
  }

  async createSV(_input: CreatePaymentTransactionInput): Promise<PaymentTransactionRow> {
    const ROW = await PRISMA.transaction.create({
      data: {
        matchId: _input.matchId ?? null,
        reservationId: _input.reservationId ?? null,
        userId: _input.userId,
        amountBase: new Prisma.Decimal(_input.amountBase),
        feeAmount: new Prisma.Decimal(_input.feeAmount),
        amountTotal: new Prisma.Decimal(_input.amountTotal),
        status: 'PENDING',
        paymentMethod: 'MANUAL',
      },
    });
    return mapPrismaTransactionToPaymentRowSV(ROW);
  }

  async findByIdSV(_id: string): Promise<PaymentTransactionRow | null> {
    const ROW = await PRISMA.transaction.findUnique({ where: { id: _id } });
    return ROW === null ? null : mapPrismaTransactionToPaymentRowSV(ROW);
  }

  async listByMatchSV(_matchId: string): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { matchId: _matchId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapPrismaTransactionToPaymentRowSV);
  }

  async listByReservationSV(_reservationId: string): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { reservationId: _reservationId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapPrismaTransactionToPaymentRowSV);
  }

  async listByUserSV(_userId: string, _limit: number): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { userId: _userId },
      orderBy: { createdAt: 'desc' },
      take: _limit,
    });
    return ROWS.map(mapPrismaTransactionToPaymentRowSV);
  }

  async confirmManualSV(
    _input: ConfirmStaffTransactionInput,
  ): Promise<{ id: string; status: string; confirmedAt: Date }> {
    const UPDATE_DATA: Record<string, unknown> = {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    };
    if (_input.venuePaymentMethodId) {
      UPDATE_DATA.venuePaymentMethodId = _input.venuePaymentMethodId;
    }
    if (_input.referenceNumber) {
      UPDATE_DATA.referenceNumber = _input.referenceNumber;
    }
    if (_input.paymentData) {
      UPDATE_DATA.paymentData = _input.paymentData;
    }
    if (_input.confirmedBy) {
      UPDATE_DATA.confirmedBy = _input.confirmedBy;
    }

    if (_input.mcp !== undefined) {
      UPDATE_DATA.obligationCurrency = _input.mcp.obligationCurrency;
      UPDATE_DATA.obligationAmountMinor = _input.mcp.obligationAmountMinor;
      UPDATE_DATA.feeAmountMinor = _input.mcp.feeAmountMinor;
      UPDATE_DATA.obligationTotalMinor = _input.mcp.obligationTotalMinor;
      UPDATE_DATA.pricingCurrency = _input.mcp.pricingCurrency;
      UPDATE_DATA.settlementCurrency = _input.mcp.settlementCurrency;
      UPDATE_DATA.settlementAmountMinor = _input.mcp.settlementAmountMinor;
      UPDATE_DATA.appliedToObligationMinor = _input.mcp.appliedToObligationMinor;
      UPDATE_DATA.amountBsMinor = _input.mcp.amountBsMinor;
    }

    const UPDATED = await PRISMA.$transaction(async (_tx) => {
      const ROW = await _tx.transaction.update({
        where: { id: _input.transactionId },
        data: UPDATE_DATA,
      });

      if (_input.mcp?.conversionRecord !== undefined) {
        await _tx.currencyConversionRecord.create({
          data: {
            transactionId: _input.transactionId,
            fromCurrency: _input.mcp.conversionRecord.fromCurrency,
            toCurrency: _input.mcp.conversionRecord.toCurrency,
            fromAmountMinor: _input.mcp.conversionRecord.fromAmountMinor,
            toAmountMinor: _input.mcp.conversionRecord.toAmountMinor,
            rateToBs: new Prisma.Decimal(_input.mcp.conversionRecord.rateToBs),
            rateDate: _input.mcp.conversionRecord.rateDate,
            exchangeRateId: _input.mcp.conversionRecord.exchangeRateId,
            source: _input.mcp.conversionRecord.source,
          },
        });
      }

      return ROW;
    });
    if (UPDATED.confirmedAt === null) {
      throw new Error('ESTADO_INCONSISTENTE');
    }
    return {
      id: UPDATED.id,
      status: UPDATED.status,
      confirmedAt: UPDATED.confirmedAt,
    };
  }

  async rejectManualSV(_id: string): Promise<{ id: string; status: string }> {
    const ROW = await PRISMA.transaction.update({
      where: { id: _id },
      data: { status: 'CANCELLED' },
    });
    return { id: ROW.id, status: ROW.status };
  }

  async syncReservationPaymentSV(_reservationId: string): Promise<{
    totalAmountCents: number | null;
    paidAmountCents: number;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    pricingCurrency: string;
    totalAmountMinor: bigint | null;
    paidAmountMinor: bigint;
    paidAmountBsMinor: bigint | null;
  }> {
    const RESERVATION = await PRISMA.reservation.findUnique({
      where: { id: _reservationId },
      select: {
        totalAmountCents: true,
        totalAmountMinor: true,
        pricingCurrency: true,
        paidAmountMinor: true,
        paidAmountCents: true,
        paidAmountBsMinor: true,
      },
    });

    const CONFIRMED_TXS = await PRISMA.transaction.findMany({
      where: { reservationId: _reservationId, status: 'CONFIRMED' },
      select: {
        amountTotal: true,
        appliedToObligationMinor: true,
        amountBsMinor: true,
      },
    });

    let paidMinor = 0n;
    if (isMultiCurrencyPaymentsEnabledSV()) {
      for (const TX of CONFIRMED_TXS) {
        if (TX.appliedToObligationMinor !== null) {
          paidMinor += TX.appliedToObligationMinor;
        } else {
          paidMinor += BigInt(Math.round(Number(TX.amountTotal) * 100));
        }
      }
    } else {
      const PAID_MAJOR = CONFIRMED_TXS.reduce(
        (sum, tx) => sum + Number(tx.amountTotal),
        0,
      );
      paidMinor = BigInt(Math.round(PAID_MAJOR * 100));
    }

    const TOTAL_MINOR = RESERVATION?.totalAmountMinor
      ?? BigInt(RESERVATION?.totalAmountCents ?? 0);

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    if (paidMinor < TOTAL_MINOR) {
      paymentStatus = paidMinor > 0n ? 'PARTIAL' : 'UNPAID';
    } else {
      paymentStatus = 'PAID';
    }

    let paidBsMinor = 0n;
    if (isMultiCurrencyPaymentsEnabledSV()) {
      for (const TX of CONFIRMED_TXS) {
        if (TX.amountBsMinor !== null) {
          paidBsMinor += TX.amountBsMinor;
        }
      }
    }

    const UPDATE_DATA: Record<string, unknown> = {
      paidAmountMinor: paidMinor,
      paymentStatus,
    };

    if (isReservationPaymentLedgerEnabledSV()) {
      UPDATE_DATA.paidAmountBsMinor = paidBsMinor;
    }

    if (
      isMultiCurrencyPaymentsEnabledSV()
      && RESERVATION?.pricingCurrency === 'BS'
    ) {
      UPDATE_DATA.paidAmountCents = Number(paidMinor);
    } else if (!isMultiCurrencyPaymentsEnabledSV()) {
      UPDATE_DATA.paidAmountCents = Number(paidMinor);
    }

    const UPDATED = await PRISMA.reservation.update({
      where: { id: _reservationId },
      data: UPDATE_DATA,
    });

    return {
      totalAmountCents: UPDATED.totalAmountCents,
      paidAmountCents: UPDATED.paidAmountCents,
      paymentStatus: UPDATED.paymentStatus,
      pricingCurrency: UPDATED.pricingCurrency,
      totalAmountMinor: UPDATED.totalAmountMinor,
      paidAmountMinor: UPDATED.paidAmountMinor,
      paidAmountBsMinor: UPDATED.paidAmountBsMinor,
    };
  }

  async findForStaffConfirmSV(
    _transactionId: string,
  ): Promise<StaffTransactionRow | null> {
    const WITH_RESERVATION = await PRISMA.transaction.findUnique({
      where: { id: _transactionId },
      include: {
        reservation: {
          include: {
            venue: {
              include: {
                monetizationSettings: true,
              },
            },
            court: { include: { venue: true } },
          },
        },
      },
    });
    const WITH_MATCH = await PRISMA.transaction.findUnique({
      where: { id: _transactionId },
      include: {
        match: {
          include: {
            court: {
              include: {
                venue: {
                  include: {
                    monetizationSettings: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const ROW =
      WITH_RESERVATION?.reservationId != null ? WITH_RESERVATION : WITH_MATCH;
    return ROW === null ? null : mapPrismaTransactionToStaffRowSV(ROW);
  }

  async listPendingByVenueSV(
    _venueId: string,
    _filters?: ListPendingStaffTransactionsFilters,
  ): Promise<PendingStaffTransactionRow[]> {
    const WHERE: PrismaTypes.TransactionWhereInput = {
      status: 'PENDING',
    };

    if (_filters?.type === 'RESERVATION') {
      WHERE.reservationId = { not: null };
      WHERE.reservation = {
        court: { venueId: _venueId },
      };
    } else if (_filters?.type === 'MATCH') {
      WHERE.matchId = { not: null };
      WHERE.match = {
        court: { venueId: _venueId },
      };
    } else {
      WHERE.OR = [
        {
          matchId: { not: null },
          match: { court: { venueId: _venueId } },
        },
        {
          reservationId: { not: null },
          reservation: { court: { venueId: _venueId } },
        },
      ];
    }

    if (_filters?.from !== undefined || _filters?.to !== undefined) {
      WHERE.createdAt = {
        ...(_filters.from !== undefined ? { gte: new Date(_filters.from) } : {}),
        ...(_filters.to !== undefined ? { lte: new Date(_filters.to) } : {}),
      };
    }

    if (_filters?.matchId !== undefined) {
      WHERE.matchId = _filters.matchId;
    }

    if (_filters?.reservationId !== undefined) {
      WHERE.reservationId = _filters.reservationId;
    }

    const ROWS = await PRISMA.transaction.findMany({
      where: WHERE,
      include: {
        user: { select: { name: true, email: true } },
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, mimeType: true },
        },
        match: {
          include: {
            court: { include: { venue: true } },
          },
        },
        reservation: {
          include: {
            court: { include: { venue: true } },
          },
        },
        venuePaymentMethod: {
          select: { type: true, name: true, config: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const MATCH_IDS_WITHOUT_RES = ROWS.filter(
      (_r) => _r.reservationId === null && _r.matchId !== null,
    ).map((_r) => _r.matchId as string);

    const RES_BY_MATCH =
      MATCH_IDS_WITHOUT_RES.length > 0
        ? await PRISMA.reservation.findMany({
            where: { matchId: { in: MATCH_IDS_WITHOUT_RES } },
            select: {
              id: true,
              matchId: true,
              scheduledAt: true,
              durationMinutes: true,
              sportId: true,
              categoryId: true,
              type: true,
              court: { select: { id: true, name: true, venueId: true } },
            },
          })
        : [];

    const RESERVATION_BY_MATCH_ID = new Map(
      RES_BY_MATCH.filter((_r) => _r.matchId !== null).map((_r) => [_r.matchId!, _r]),
    );

    return ROWS.map((_r) => {
      let row = _r as PendingTransactionPrismaRow;
      if (row.reservationId === null && row.matchId !== null) {
        const LINKED = RESERVATION_BY_MATCH_ID.get(row.matchId);
        if (LINKED !== undefined) {
          row = {
            ...row,
            reservationId: LINKED.id,
            reservation: LINKED,
          };
        }
      }
      return mapPrismaTransactionToPendingStaffRowSV(row);
    });
  }

  async recordPlayerPaymentSelectionSV(_input: {
    transactionId: string;
    actorUserId: string;
    venuePaymentMethodId?: string;
    paymentMethodType?: string;
    reportedSettlement?: { amountMinor: bigint; currencyCode: string };
  }): Promise<void> {
    const TX = await PRISMA.transaction.findUnique({
      where: { id: _input.transactionId },
      select: { id: true, userId: true, status: true },
    });

    if (TX === null) {
      throw new Error('TRANSACCION_NO_ENCONTRADA');
    }
    if (TX.userId !== _input.actorUserId) {
      throw new Error('NO_AUTORIZADO');
    }
    if (TX.status !== 'PENDING') {
      throw new Error('TRANSACCION_NO_PENDIENTE');
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let venuePaymentMethodId: string | null = null;
    let paymentData: PrismaTypes.InputJsonValue;

    if (
      _input.venuePaymentMethodId !== undefined
      && _input.venuePaymentMethodId.length > 0
      && UUID_RE.test(_input.venuePaymentMethodId)
    ) {
      const METHOD = await PRISMA.venuePaymentMethod.findUnique({
        where: { id: _input.venuePaymentMethodId },
        select: { id: true, type: true, name: true, config: true },
      });
      if (METHOD === null) {
        throw new Error('MEDIO_PAGO_NO_ENCONTRADO');
      }
      venuePaymentMethodId = METHOD.id;
      paymentData = {
        playerSelection: {
          type: METHOD.type,
          name: METHOD.name,
          config: METHOD.config,
          ...(_input.reportedSettlement !== undefined
            ? {
                reportedSettlement: {
                  amountMinor: _input.reportedSettlement.amountMinor.toString(),
                  currencyCode: _input.reportedSettlement.currencyCode,
                },
              }
            : {}),
        },
      };
    } else if (_input.paymentMethodType !== undefined && _input.paymentMethodType.length > 0) {
      const TYPE = _input.paymentMethodType.toUpperCase();
      const LEGACY_NAMES: Record<string, string> = {
        TRANSFER: 'Transferencia bancaria',
        BANK_TRANSFER: 'Transferencia bancaria',
        CASH: 'Efectivo',
        PAGO_MOVIL: 'Pago móvil',
        POS: 'POS',
      };
      paymentData = {
        playerSelection: {
          type: TYPE,
          name: LEGACY_NAMES[TYPE] ?? TYPE,
          legacy: true,
          ...(_input.reportedSettlement !== undefined
            ? {
                reportedSettlement: {
                  amountMinor: _input.reportedSettlement.amountMinor.toString(),
                  currencyCode: _input.reportedSettlement.currencyCode,
                },
              }
            : {}),
        },
      };
    } else {
      throw new Error('SELECCION_PAGO_REQUERIDA');
    }

    await PRISMA.transaction.update({
      where: { id: _input.transactionId },
      data: {
        venuePaymentMethodId,
        paymentData,
      },
    });
  }
}
