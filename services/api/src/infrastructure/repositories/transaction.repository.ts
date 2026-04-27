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
