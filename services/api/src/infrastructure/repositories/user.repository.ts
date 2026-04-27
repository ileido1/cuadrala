import type { SubscriptionType } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export async function findUserByIdRepo(_id: string) {
  return PRISMA.user.findUnique({ where: { id: _id } });
}

export async function updateUserSubscriptionRepo(_id: string, _subscriptionType: SubscriptionType) {
  return PRISMA.user.update({
    where: { id: _id },
    data: { subscriptionType: _subscriptionType },
  });
}

export async function countUsersByIdsRepo(_ids: string[]): Promise<number> {
  if (_ids.length === 0) {
    return 0;
  }
  return PRISMA.user.count({ where: { id: { in: _ids } } });
}

export async function listUsersNotInRepo(
  _excludeUserIds: string[],
  _limit: number,
): Promise<{ id: string; name: string; email: string }[]> {
  return PRISMA.user.findMany({
    where: _excludeUserIds.length > 0 ? { id: { notIn: _excludeUserIds } } : {},
    orderBy: { name: 'asc' },
    take: _limit,
    select: { id: true, name: true, email: true },
  });
}
