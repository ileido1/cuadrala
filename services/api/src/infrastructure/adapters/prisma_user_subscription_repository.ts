import type { UserSubscriptionRepository } from '../../domain/ports/user_subscription_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserSubscriptionRepository implements UserSubscriptionRepository {
  async existsSV(_userId: string): Promise<boolean> {
    const USER = await PRISMA.user.findUnique({
      where: { id: _userId },
      select: { id: true },
    });
    return USER !== null;
  }

  async updateSubscriptionSV(
    _userId: string,
    _subscriptionType: 'FREE' | 'PRO',
  ): Promise<{ userId: string; subscriptionType: string }> {
    const UPDATED = await PRISMA.user.update({
      where: { id: _userId },
      data: { subscriptionType: _subscriptionType },
      select: { id: true, subscriptionType: true },
    });
    return {
      userId: UPDATED.id,
      subscriptionType: UPDATED.subscriptionType,
    };
  }
}
