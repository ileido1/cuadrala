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
  VenueStaffTransactionRepository,
} from '../../domain/ports/venue_staff_transaction_repository.js';

import { PRISMA } from '../prisma_client.js';

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
    return ROW as PaymentTransactionRow | null;
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
    return ROW as PaymentTransactionRow | null;
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
    return ROW as PaymentTransactionRow;
  }

  async findByIdSV(_id: string): Promise<PaymentTransactionRow | null> {
    const ROW = await PRISMA.transaction.findUnique({ where: { id: _id } });
    return ROW as PaymentTransactionRow | null;
  }

  async listByMatchSV(_matchId: string): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { matchId: _matchId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS as PaymentTransactionRow[];
  }

  async listByReservationSV(_reservationId: string): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { reservationId: _reservationId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS as PaymentTransactionRow[];
  }

  async listByUserSV(_userId: string, _limit: number): Promise<PaymentTransactionRow[]> {
    const ROWS = await PRISMA.transaction.findMany({
      where: { userId: _userId },
      orderBy: { createdAt: 'desc' },
      take: _limit,
    });
    return ROWS as PaymentTransactionRow[];
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

    const UPDATED = await PRISMA.transaction.update({
      where: { id: _input.transactionId },
      data: UPDATE_DATA,
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
  }> {
    const CONFIRMED = await PRISMA.transaction.aggregate({
      where: { reservationId: _reservationId, status: 'CONFIRMED' },
      _sum: { amountTotal: true },
    });

    const PAID_MAJOR = Number(
      (CONFIRMED._sum.amountTotal ?? new Prisma.Decimal(0)).toString(),
    );
    const PAID_CENTS = Math.round(PAID_MAJOR * 100);

    const RESERVATION = await PRISMA.reservation.findUnique({
      where: { id: _reservationId },
      select: { totalAmountCents: true },
    });

    const TOTAL_CENTS = RESERVATION?.totalAmountCents ?? 0;

    let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    if (PAID_CENTS < TOTAL_CENTS) {
      paymentStatus = PAID_CENTS > 0 ? 'PARTIAL' : 'UNPAID';
    } else {
      paymentStatus = 'PAID';
    }

    const UPDATED = await PRISMA.reservation.update({
      where: { id: _reservationId },
      data: {
        paidAmountCents: PAID_CENTS,
        paymentStatus,
      },
    });

    return {
      totalAmountCents: UPDATED.totalAmountCents,
      paidAmountCents: UPDATED.paidAmountCents,
      paymentStatus: UPDATED.paymentStatus,
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
            venue: true,
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
                venue: true,
              },
            },
          },
        },
      },
    });
    const ROW =
      WITH_RESERVATION?.reservationId != null ? WITH_RESERVATION : WITH_MATCH;
    return ROW as StaffTransactionRow | null;
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
      },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS as PendingStaffTransactionRow[];
  }
}
