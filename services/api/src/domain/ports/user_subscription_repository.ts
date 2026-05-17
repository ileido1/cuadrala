export interface UserSubscriptionRepository {
  existsSV(_userId: string): Promise<boolean>;
  updateSubscriptionSV(
    _userId: string,
    _subscriptionType: 'FREE' | 'PRO',
  ): Promise<{ userId: string; subscriptionType: string }>;
}
