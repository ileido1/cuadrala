import type { Prisma } from '../../generated/prisma/client.js';

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
    matchId: string;
    userId: string;
    amountBase: Prisma.Decimal;
    feeAmount: Prisma.Decimal;
    amountTotal: Prisma.Decimal;
  },
  _client: Prisma.TransactionClient = PRISMA,
) {
  return _client.transaction.create({
    data: {
      matchId: _data.matchId,
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

export async function listPendingTransactionsByVenueRepo(
  _venueId: string,
  _filters?: {
    from?: string;
    to?: string;
    matchId?: string;
  },
) {
  const WHERE: Prisma.TransactionWhereInput = {
    status: 'PENDING',
    match: {
      court: {
        venueId: _venueId,
      },
    },
  };

  if (_filters?.from !== undefined || _filters?.to !== undefined) {
    WHERE.createdAt = {
      ...(_filters.from !== undefined ? { gte: new Date(_filters.from) } : {}),
      ...(_filters.to !== undefined ? { lte: new Date(_filters.to) } : {}),
    };
  }

  if (_filters?.matchId !== undefined) {
    WHERE.matchId = _filters.matchId;
  }

  return PRISMA.transaction.findMany({
    where: WHERE,
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
    orderBy: { createdAt: 'asc' },
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
