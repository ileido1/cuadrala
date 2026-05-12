import type { Prisma } from '../../generated/prisma/client.js';
import { Prisma as PrismaValue } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export async function findPendingOrConfirmedForMatchUserRepo(
  _matchId: string,
  _userId: string,
  _client: Prisma.TransactionClient = PRISMA,
) {
  return _client.transaction.findFirst({
    where: {
      matchId: _matchId,
      userId: _userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
}

export async function createTransactionRepo(
  _data: {
    matchId?: string;
    reservationId?: string;
    userId: string;
    amountBase: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
    amountTotal: Prisma.Decimal;
  },
  _client: Prisma.TransactionClient = PRISMA,
) {
  return _client.transaction.create({
    data: {
      matchId: _data.matchId ?? null,
      reservationId: _data.reservationId ?? null,
      userId: _data.userId,
      amountBase: _data.amountBase,
      feeAmount: _data.feeAmount,
      amountTotal: _data.amountTotal,
      status: 'PENDING',
      paymentMethod: 'MANUAL',
    },
  });
}

export async function findTransactionByIdRepo(_id: string) {
  return PRISMA.transaction.findUnique({ where: { id: _id } });
}

export async function findTransactionWithVenueRepo(_id: string) {
  return PRISMA.transaction.findUnique({
    where: { id: _id },
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
}

export async function confirmTransactionManualRepo(_id: string) {
  return PRISMA.transaction.update({
    where: { id: _id },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });
}

export async function rejectTransactionManualRepo(_id: string) {
  return PRISMA.transaction.update({
    where: { id: _id },
    data: {
      status: 'CANCELLED',
    },
  });
}

export async function listTransactionsByMatchRepo(_matchId: string) {
  return PRISMA.transaction.findMany({
    where: { matchId: _matchId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listTransactionsByUserRepo(_userId: string, _limit: number) {
  return PRISMA.transaction.findMany({
    where: { userId: _userId },
    orderBy: { createdAt: 'desc' },
    take: _limit,
  });
}

export async function findPendingOrConfirmedForReservationUserRepo(
  _reservationId: string,
  _userId: string,
  _client: Prisma.TransactionClient = PRISMA,
) {
  return _client.transaction.findFirst({
    where: {
      reservationId: _reservationId,
      userId: _userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  });
}

export async function listTransactionsByReservationRepo(_reservationId: string) {
  return PRISMA.transaction.findMany({
    where: { reservationId: _reservationId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function listPendingTransactionsByVenueRepo(
  _venueId: string,
  _filters?: {
    from?: string;
    to?: string;
    matchId?: string;
    reservationId?: string;
    type?: 'MATCH' | 'RESERVATION';
  },
) {
  const WHERE: Prisma.TransactionWhereInput = {
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
    // All types combined
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

  return PRISMA.transaction.findMany({
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
}

export async function updateReservationPaymentFromTransactionRepo(
  _reservationId: string,
  _client: Prisma.TransactionClient = PRISMA,
) {
  // Sum confirmed transaction amounts for this reservation
  const CONFIRMED = await _client.transaction.aggregate({
    where: { reservationId: _reservationId, status: 'CONFIRMED' },
    _sum: { amountTotal: true },
  });

  const PAID = CONFIRMED._sum.amountTotal ?? new PrismaValue.Decimal(0);

  // Get reservation to check totalAmountCents
  const RESERVATION = await _client.reservation.findUnique({
    where: { id: _reservationId },
    select: { totalAmountCents: true },
  });

  let paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  if (PAID.lt(new PrismaValue.Decimal(RESERVATION?.totalAmountCents ?? 0))) {
    paymentStatus = PAID.gt(new PrismaValue.Decimal(0)) ? 'PARTIAL' : 'UNPAID';
  } else {
    paymentStatus = 'PAID';
  }

  return _client.reservation.update({
    where: { id: _reservationId },
    data: {
      paidAmountCents: Number(PAID.toString()),
      paymentStatus,
    },
  });
}

export async function findTransactionWithReservationVenueRepo(_id: string) {
  return PRISMA.transaction.findUnique({
    where: { id: _id },
    include: {
      reservation: {
        include: {
          court: { include: { venue: true } },
        },
      },
    },
  });
}
